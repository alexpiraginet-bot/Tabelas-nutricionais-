// Gera pôsteres de cardápio (A4, alta resolução) a partir das fotos e dos dados.
// Saída: /tmp/menu-gelatos.png e /tmp/menu-picoles.png
import sharp from "sharp";
import { PRODUCTS } from "../src/data.js";
import { readFileSync } from "node:fs";

const W = 1654, H = 2339;                  // A4 retrato @ ~200dpi
const OLIVE = "#38512F", GOLD = "#B6905F", CREAM = "#F1ECDD", CARD = "#FBF8EE", INK = "#23271A", SOFT = "#6A6E58";
const esc = s => String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
const logo = readFileSync(new URL("../public/bento-logo.png", import.meta.url));

async function poster(items, { title, subtitle, cols, file }) {
  const rows = Math.ceil(items.length / cols);
  const headH = 360;
  const gridTop = headH + 40, gridBot = H - 120;
  const colW = W / cols;
  const rowH = (gridBot - gridTop) / rows;
  const photo = Math.min(colW - 70, rowH - 150);   // tamanho da foto

  // camada de fotos
  const photoComposites = [];
  items.forEach((p, i) => {
    const cx = colW * (i % cols) + colW / 2;
    const ry = gridTop + rowH * Math.floor(i / cols);
    photoComposites.push({ id: p.id, left: Math.round(cx - photo / 2), top: Math.round(ry + 6), size: Math.round(photo) });
  });

  // SVG de fundo + textos
  let svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${W}" height="${H}" fill="${CREAM}"/>
    <rect x="0" y="0" width="${W}" height="${headH}" fill="${OLIVE}"/>
    <text x="${W/2}" y="170" fill="#F1ECDD" font-family="Georgia, serif" font-size="92" font-weight="600" text-anchor="middle" letter-spacing="6">${esc(title)}</text>
    <text x="${W/2}" y="232" fill="${GOLD}" font-family="Georgia, serif" font-size="40" font-style="italic" text-anchor="middle">${esc(subtitle)}</text>
    <text x="${W/2}" y="300" fill="#D8C7AE" font-family="monospace" font-size="24" text-anchor="middle" letter-spacing="6">ZERO AÇÚCAR ADICIONADO · RICO EM PROTEÍNA · RÓTULO LIMPO</text>`;

  items.forEach((p, i) => {
    const cx = Math.round(colW * (i % cols) + colW / 2);
    const ry = gridTop + rowH * Math.floor(i / cols);
    const ty = Math.round(ry + 6 + photo + 38);
    const kcal = p.nutrition.kcal, prot = String(p.nutrition.protein).replace(".", ",");
    const tags = [];
    if (!p.flags.gluten) tags.push("S/ GLÚTEN");
    if (!p.flags.lactose) tags.push("ZERO LACTOSE");
    if (p.nutrition.addedSugars === 0) tags.push("S/ AÇÚCAR ADIC.");
    const tagStr = tags.slice(0, 2).join("  ·  ");
    svg += `
    <text x="${cx}" y="${ty}" fill="${INK}" font-family="Georgia, serif" font-size="34" font-weight="600" text-anchor="middle">${esc(p.name)}</text>
    <text x="${cx}" y="${ty + 34}" fill="${SOFT}" font-family="sans-serif" font-size="22" text-anchor="middle">${esc(p.sub || "")}</text>
    <text x="${cx}" y="${ty + 72}" fill="${OLIVE}" font-family="monospace" font-size="27" font-weight="bold" text-anchor="middle">${kcal} kcal · ${prot}g proteína</text>
    <text x="${cx}" y="${ty + 104}" fill="${GOLD}" font-family="monospace" font-size="18" text-anchor="middle" letter-spacing="2">${esc(tagStr)}</text>`;
  });

  svg += `
    <text x="${W/2}" y="${H-64}" fill="${OLIVE}" font-family="Georgia, serif" font-size="30" font-style="italic" text-anchor="middle">Bentô · Functional Nutrition — Espírito Santo, Brasil</text>
    <text x="${W/2}" y="${H-34}" fill="${SOFT}" font-family="monospace" font-size="18" text-anchor="middle" letter-spacing="2">Valores por porção · consulte a ficha completa no app via QR</text>
  </svg>`;

  // base com SVG, depois fotos por cima
  const composites = [];
  for (const pc of photoComposites) {
    let img;
    try {
      const buf = readFileSync(new URL(`../public/sabores/${pc.id}.jpg`, import.meta.url));
      // máscara arredondada
      const r = 18;
      const mask = Buffer.from(`<svg width="${pc.size}" height="${pc.size}"><rect width="${pc.size}" height="${pc.size}" rx="${r}" ry="${r}"/></svg>`);
      img = await sharp(buf).resize(pc.size, pc.size, { fit: "cover" }).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
    } catch { continue; }
    composites.push({ input: img, left: pc.left, top: pc.top });
  }
  // logo no canto do cabeçalho
  const lg = await sharp(logo).resize(150, 150).png().toBuffer();
  composites.unshift({ input: lg, left: 60, top: 40 });
  composites.unshift({ input: await sharp(logo).resize(150,150).png().toBuffer(), left: W-210, top: 40 });

  await sharp(Buffer.from(svg)).png().composite(composites).png().toFile(file);
  console.log("→", file, `(${items.length} itens)`);
}

const gelatos = PRODUCTS.filter(p => p.category === "gelato");
const picoles = PRODUCTS.filter(p => p.category === "bentole");
await poster(gelatos, { title: "GELATOS", subtitle: "Linha Vitrine · cremoso italiano", cols: 3, file: "/tmp/menu-gelatos.png" });
await poster(picoles, { title: "BENTÔLÉ", subtitle: "Mini picolés premium · take-home", cols: 3, file: "/tmp/menu-picoles.png" });
