import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

import { ALLERGENS, AVISO_POLIOL, PRODUCTS, sugarClaim } from "../src/data.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const productId = "bentole-framboesa-duo";
const outputPath = path.join(repoRoot, "public/social/framboesa-duo-tabela-nutricional-story.png");
const dailyValues = {
  kcal: 2000,
  carbs: 300,
  addedSugars: 50,
  protein: 50,
  fat: 65,
  satFat: 20,
  fiber: 25,
  sodium: 2000,
};

const numberFormatters = new Map();

function formatNumber(value, maximumFractionDigits = 1) {
  if (!numberFormatters.has(maximumFractionDigits)) {
    numberFormatters.set(maximumFractionDigits, new Intl.NumberFormat("pt-BR", {
      maximumFractionDigits,
      minimumFractionDigits: 0,
    }));
  }
  return numberFormatters.get(maximumFractionDigits).format(value);
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function percentage(value, key) {
  return `${Math.round((value / dailyValues[key]) * 100)}%`;
}

function storyRows(product) {
  const { nutrition: n, serving } = product;
  const per100 = (value) => value * (100 / serving);
  const sodiumPortion = n.sodium < 5 ? 0 : n.sodium;
  const sodium100 = per100(n.sodium) < 5 ? 0 : per100(n.sodium);
  return [
    ["Valor energético (kcal)", formatNumber(Math.round(per100(n.kcal)), 0), formatNumber(n.kcal, 0), percentage(n.kcal, "kcal")],
    ["Carboidratos", `${formatNumber(per100(n.carbs))} g`, `${formatNumber(n.carbs)} g`, percentage(n.carbs, "carbs")],
    ["Açúcares totais", `${formatNumber(per100(n.sugars))} g`, `${formatNumber(n.sugars)} g`, "—", true],
    ["Açúcares adicionados", `${formatNumber(per100(n.addedSugars))} g`, `${formatNumber(n.addedSugars)} g`, percentage(n.addedSugars, "addedSugars"), true],
    ["Proteínas", `${formatNumber(per100(n.protein))} g`, `${formatNumber(n.protein)} g`, percentage(n.protein, "protein"), false, true],
    ["Gorduras totais", `${formatNumber(per100(n.fat))} g`, `${formatNumber(n.fat)} g`, percentage(n.fat, "fat")],
    ["Gorduras saturadas", `${formatNumber(per100(n.satFat))} g`, `${formatNumber(n.satFat)} g`, percentage(n.satFat, "satFat"), true],
    ["Gorduras trans", `${formatNumber(per100(n.transFat))} g`, `${formatNumber(n.transFat)} g`, "—", true],
    ["Fibras alimentares", `${formatNumber(per100(n.fiber))} g`, `${formatNumber(n.fiber)} g`, percentage(n.fiber, "fiber")],
    ["Sódio", `${formatNumber(sodium100, 2)} mg`, `${formatNumber(sodiumPortion, 2)} mg`, percentage(sodiumPortion, "sodium")],
  ];
}

export async function buildStorySvg(product) {
  if (!product || product.id !== productId) {
    throw new Error(`Produto canônico não encontrado: ${productId}`);
  }

  const [logo, productPhoto] = await Promise.all([
    sharp(path.join(repoRoot, "public/bento-logo.webp")).png().toBuffer(),
    readFile(path.join(repoRoot, product.image.replace(/^\//, "public/"))),
  ]);
  const logoData = `data:image/png;base64,${logo.toString("base64")}`;
  const photoData = `data:image/jpeg;base64,${productPhoto.toString("base64")}`;
  const rows = storyRows(product);
  const { nutrition } = product;
  const allergens = (ALLERGENS[product.id] || []).join(", ");
  const claim = sugarClaim(product);
  const lactoseBadge = product.flags.lactose ? "" : `
    <rect x="480" y="680" width="184" height="42" rx="21" fill="#E5EBD3"/>
    <text x="572" y="708" text-anchor="middle" class="sans" font-size="16" font-weight="700" letter-spacing="2" fill="#46583A">ZERO LACTOSE</text>`;
  const sugarBadge = claim ? `
    <rect x="680" y="680" width="282" height="42" rx="21" fill="#E5EBD3"/>
    <text x="821" y="708" text-anchor="middle" class="sans" font-size="16" font-weight="700" letter-spacing="1.6" fill="#46583A">${escapeXml(claim.label)}</text>` : "";
  const sugarNote = claim?.note ? `
    <text x="94" y="1676" class="sans" font-size="16" fill="#5E6353">${escapeXml(claim.note)}</text>` : "";
  const allergenStatement = allergens ? `ALÉRGICOS: CONTÉM ${allergens}. ` : "";
  const glutenStatement = product.flags.gluten ? "CONTÉM GLÚTEN." : "NÃO CONTÉM GLÚTEN.";
  const polyolNote = product.hasPolyols ? `
    <text x="94" y="1760" class="sans" font-size="16" fill="#6B5010">Contém polióis. ${escapeXml(AVISO_POLIOL)}</text>` : "";
  const rowMarkup = rows.map(([label, value100, valueServing, daily, indented, highlighted], index) => {
    const top = 1020 + index * 58;
    const baseline = top + 37;
    const labelX = indented ? 116 : 94;
    return `
      <rect x="72" y="${top}" width="936" height="58" fill="${highlighted ? "#EFF5E5" : "#FFFDF7"}"/>
      <line x1="94" y1="${top + 58}" x2="986" y2="${top + 58}" stroke="#E4DCC9" stroke-width="1"/>
      <text x="${labelX}" y="${baseline}" class="row${highlighted ? " strong" : ""}">${escapeXml(label)}</text>
      <text x="742" y="${baseline}" text-anchor="end" class="value muted">${escapeXml(value100)}</text>
      <text x="890" y="${baseline}" text-anchor="end" class="value${highlighted ? " strong" : ""}">${escapeXml(valueServing)}</text>
      <text x="974" y="${baseline}" text-anchor="end" class="daily">${escapeXml(daily)}</text>`;
  }).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
  <svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
    <defs>
      <clipPath id="photo-clip"><rect x="72" y="430" width="354" height="354" rx="28"/></clipPath>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="#232619" flood-opacity="0.12"/>
      </filter>
    </defs>
    <style>
      .sans{font-family:Arial,Helvetica,sans-serif}.serif{font-family:Georgia,'Times New Roman',serif}
      .caps{font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;letter-spacing:5px}
      .row{font-family:Arial,Helvetica,sans-serif;font-size:23px;fill:#232619}
      .value{font-family:'Courier New',monospace;font-size:22px;fill:#232619}
      .daily{font-family:'Courier New',monospace;font-size:19px;fill:#5E6353}
      .muted{fill:#5E6353}.strong{font-weight:700;fill:#334428}
    </style>
    <rect width="1080" height="1920" fill="#F6F1E7"/>
    <circle cx="116" cy="114" r="48" fill="#46583A"/>
    <image href="${logoData}" x="68" y="66" width="96" height="96" preserveAspectRatio="xMidYMid slice"/>
    <text x="190" y="108" class="serif" font-size="36" fill="#232619">Bentô</text>
    <text x="190" y="142" class="sans" font-size="14" letter-spacing="5" fill="#5E6353">FUNCTIONAL NUTRITION</text>
    <line x1="72" y1="190" x2="1008" y2="190" stroke="#D9D2BD" stroke-width="2"/>

    <text x="72" y="258" class="caps" fill="#46583A">TABELA NUTRICIONAL · BENTÔLÉ</text>
    <text x="72" y="352" class="serif" font-size="84" fill="#232619">${escapeXml(product.name)}</text>
    <text x="76" y="402" class="sans" font-size="25" fill="#5E6353">${escapeXml(product.sub)} · porção ${escapeXml(product.portionLabel)}</text>

    <rect x="72" y="430" width="936" height="354" rx="28" fill="#FFFDF7" filter="url(#shadow)"/>
    <image href="${photoData}" x="72" y="430" width="354" height="354" clip-path="url(#photo-clip)" preserveAspectRatio="xMidYMid slice"/>
    <text x="480" y="504" class="caps" fill="#7A5E1E">PICOLÉ · BENTÔLÉ</text>
    <text x="480" y="590" class="serif" font-size="70" fill="#232619">${formatNumber(nutrition.kcal, 0)} kcal</text>
    <text x="484" y="636" class="sans" font-size="25" fill="#5E6353">${formatNumber(nutrition.protein)} g de proteína · ${formatNumber(nutrition.fiber)} g de fibras</text>
    ${lactoseBadge}
    ${sugarBadge}

    <rect x="72" y="830" width="936" height="950" rx="24" fill="#FFFDF7" stroke="#232619" stroke-width="2"/>
    <path d="M96 830h888a24 24 0 0 1 24 24v134H72V854a24 24 0 0 1 24-24z" fill="#1F251A"/>
    <text x="98" y="900" class="serif" font-size="42" fill="#FFFDF7">Informação Nutricional</text>
    <text x="98" y="948" class="caps" font-size="14" fill="#DDE5D1">PORÇÕES POR EMBALAGEM: 1 · PORÇÃO: ${escapeXml(product.portionLabel.toUpperCase())}</text>
    <text x="94" y="1004" class="caps" font-size="14" fill="#5E6353">NUTRIENTE</text>
    <text x="742" y="1004" text-anchor="end" class="caps" font-size="14" fill="#5E6353">100 G</text>
    <text x="890" y="1004" text-anchor="end" class="caps" font-size="14" fill="#5E6353">PORÇÃO</text>
    <text x="974" y="1004" text-anchor="end" class="caps" font-size="14" fill="#5E6353">%VD*</text>
    ${rowMarkup}
    <rect x="72" y="1600" width="936" height="180" fill="#EFE7D6"/>
    <text x="94" y="1642" class="sans" font-size="16" fill="#5E6353">*Percentual de valores diários fornecidos pela porção (dieta de 2.000 kcal).</text>
    ${sugarNote}
    <text x="94" y="1710" class="sans" font-size="16" fill="#5E6353">${escapeXml(allergenStatement + glutenStatement)}</text>
    <line x1="94" y1="1732" x2="986" y2="1732" stroke="#C9A24A" stroke-width="1" stroke-dasharray="6 6"/>
    ${polyolNote}

    <text x="72" y="1854" class="caps" font-size="16" fill="#46583A">BENTOGELATERIA.COM</text>
    <text x="1008" y="1854" text-anchor="end" class="sans" font-size="17" fill="#5E6353">Consulte a ficha completa no site</text>
  </svg>`;
}

async function main() {
  const product = PRODUCTS.find(({ id }) => id === productId);
  const svg = await buildStorySvg(product);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(outputPath);
  const metadata = await sharp(outputPath).metadata();
  console.log(`Story gerado: ${path.relative(repoRoot, outputPath)} · ${metadata.width}x${metadata.height}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
