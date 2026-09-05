import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

import { PRODUCTS } from "../src/data.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const width = 1448;
const height = 1086;
const productIds = [
  "bentole-framboesa-duo",
  "bentole-snickers",
  "bentole-prestigio",
  "bentole-choco-dubai",
  "bentole-pistache-cb",
  "bentole-opereta",
];
const outputPaths = [
  "public/movimento/picoles-lineup-real.jpg",
  "public/portfolio/picoles-lineup.jpg",
];

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function formatNumber(value) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value);
}

function nameLines(name) {
  if (name === "Pistache & Choco Branco") return ["Pistache &", "Choco Branco"];
  return [name];
}

function nameMarkup(name) {
  return nameLines(name)
    .map((line, index) => `<tspan x="24" dy="${index === 0 ? 0 : 34}">${escapeXml(line)}</tspan>`)
    .join("");
}

export async function buildLineupSvg() {
  const products = productIds.map((id) => PRODUCTS.find((product) => product.id === id));
  if (products.some((product) => !product)) throw new Error("Linha Bentôlé canônica incompleta");

  const [logo, ...photos] = await Promise.all([
    sharp(path.join(repoRoot, "public/bento-logo.webp")).png().toBuffer(),
    ...products.map((product) => readFile(path.join(repoRoot, product.image.replace(/^\//, "public/")))),
  ]);
  const logoUri = `data:image/png;base64,${logo.toString("base64")}`;

  const cards = products.map((product, index) => {
    const x = 64 + (index % 3) * 448;
    const y = 202 + Math.floor(index / 3) * 410;
    const lines = nameLines(product.name);
    const metricY = lines.length === 1 ? 330 : 352;
    const portionY = lines.length === 1 ? 360 : 376;
    const photoUri = `data:image/jpeg;base64,${photos[index].toString("base64")}`;
    return `
      <g transform="translate(${x} ${y})">
        <rect width="424" height="382" rx="24" fill="#FFFDF7" stroke="#DDD5C3"/>
        <clipPath id="photo-${index}"><rect width="424" height="242" rx="24"/></clipPath>
        <image href="${photoUri}" width="424" height="242" preserveAspectRatio="xMidYMid slice" clip-path="url(#photo-${index})"/>
        <rect y="218" width="424" height="24" fill="${escapeXml(product.palette.deep)}" opacity="0.92"/>
        <text x="24" y="286" class="name">${nameMarkup(product.name)}</text>
        <text x="24" y="${metricY}" class="metric">${formatNumber(product.nutrition.kcal)} kcal</text>
        <text x="400" y="${metricY}" text-anchor="end" class="metric muted">${formatNumber(product.nutrition.protein)} g proteína</text>
        <text x="24" y="${portionY}" class="portion">Porção ${escapeXml(product.portionLabel)}</text>
      </g>`;
  }).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
  <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <style>
      .sans{font-family:Arial,Helvetica,sans-serif}.serif{font-family:Georgia,'Times New Roman',serif}
      .name{font-family:Georgia,'Times New Roman',serif;font-size:31px;font-weight:700;fill:#232619}
      .metric{font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:700;fill:#46583A}
      .muted{font-size:17px;font-weight:500;fill:#5E6353}
      .portion{font-family:Arial,Helvetica,sans-serif;font-size:15px;fill:#727663}
    </style>
    <rect width="1448" height="1086" fill="#F4F2EC"/>
    <image href="${logoUri}" x="64" y="42" width="104" height="104"/>
    <text x="194" y="76" class="sans" font-size="16" font-weight="700" letter-spacing="4" fill="#7A5E1E">BENTÔ · FUNCTIONAL NUTRITION</text>
    <text x="194" y="132" class="serif" font-size="54" fill="#232619">Linha Bentôlé</text>
    <text x="1384" y="92" text-anchor="end" class="sans" font-size="18" letter-spacing="3" fill="#5E6353">PICOLÉS FUNCIONAIS</text>
    <line x1="64" y1="170" x2="1384" y2="170" stroke="#CBBE9F" stroke-width="2"/>
    ${cards}
    <text x="64" y="1042" class="sans" font-size="15" letter-spacing="2" fill="#727663">DADOS DA FONTE CANÔNICA · IMAGENS MERAMENTE ILUSTRATIVAS</text>
    <text x="1384" y="1042" text-anchor="end" class="sans" font-size="15" letter-spacing="2" fill="#46583A">BENTOGELATERIA.COM</text>
  </svg>`;
}

export async function generateLineup() {
  const svg = await buildLineupSvg();
  const output = await sharp(Buffer.from(svg))
    .jpeg({ quality: 92, progressive: true, mozjpeg: true, chromaSubsampling: "4:4:4" })
    .toBuffer();
  await Promise.all(outputPaths.map((relativePath) => writeFile(path.join(repoRoot, relativePath), output)));
  const metadata = await sharp(output).metadata();
  console.log(`Lineup Bentôlé gerado: ${outputPaths.join(", ")} · ${metadata.width}x${metadata.height}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await generateLineup();
}
