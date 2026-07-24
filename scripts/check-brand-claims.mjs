import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PRODUCTS, sugarClaim } from "../src/data.js";

const forbidden = /\b(?:zero\s+aç[uú]car(?:es)?|sem\s+aç[uú]car\s+adicionado)\b/i;
const publicSources = [
  "../index.html",
  "../src/App.jsx",
  "../src/modals.jsx",
  "../src/PortfolioPage.jsx",
  "../src/video/BentoStory.tsx",
  "../src/video/DeliveryStory.tsx",
  "../src/video/FranquiasStory.tsx",
  "../src/video/SemCulpaStory.tsx",
  "../public/manifest.webmanifest",
];

for (const relativePath of publicSources) {
  const source = await readFile(new URL(relativePath, import.meta.url), "utf8");
  assert.doesNotMatch(
    source,
    forbidden,
    `${relativePath} voltou a publicar uma alegação de açúcares proibida pela política Bentô`,
  );
}

for (const product of PRODUCTS) {
  assert.doesNotMatch(
    [product.name, product.sub, product.description].filter(Boolean).join(" "),
    forbidden,
    `${product.name} contém alegação de açúcares proibida`,
  );
  const claim = sugarClaim(product);
  assert.ok(
    claim === null || claim.label === "SEM ADIÇÃO DE AÇÚCARES",
    `${product.name} gerou uma alegação diferente de SEM ADIÇÃO DE AÇÚCARES`,
  );
}

console.log(`Política de açúcares validada em ${publicSources.length} superfícies e ${PRODUCTS.length} produtos.`);
