// Gera planilhas (CSV) a partir da fonte única src/data.js
//   - public/tabela-nutricional.csv : 1 linha por sabor, com toda a tabela nutricional
//   - public/ficha-tecnica.csv      : 1 linha por ingrediente, com colunas de custo p/ preencher
// Uso: npm run fichas
import { PRODUCTS, BASE, ALLERGENS } from "../src/data.js";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
mkdirSync(OUT, { recursive: true });

// Excel-BR: separador ';' e BOM UTF-8 para acentos abrirem corretos
const SEP = ";";
const BOM = "﻿";
const esc = (v) => {
  const s = String(v ?? "");
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const toCSV = (rows) => BOM + rows.map((r) => r.map(esc).join(SEP)).join("\r\n") + "\r\n";
const cat = (c) => (c === "gelato" ? "Gelato (vitrine)" : "Bentôlé (picolé)");

// ---- 1) Tabela nutricional ----
const nutHeader = [
  "Sabor", "Linha", "Porção", "Rendimento",
  "Energia (kcal)", "Carboidratos (g)", "Açúcares totais (g)", "Açúcares adic. (g)",
  "Proteínas (g)", "Gorduras totais (g)", "Gord. saturadas (g)", "Gord. trans (g)",
  "Fibra alimentar (g)", "Sódio (mg)", "Contém glúten", "Contém lactose", "ALÉRGICOS: CONTÉM",
];
const nutRows = PRODUCTS.map((p) => {
  const n = p.nutrition;
  return [
    p.name, cat(p.category), p.portionLabel, p.yield,
    n.kcal, n.carbs, n.sugars, n.addedSugars, n.protein, n.fat, n.satFat,
    n.transFat, n.fiber, n.sodium, p.flags.gluten ? "sim" : "não", p.flags.lactose ? "sim" : "não",
    (ALLERGENS[p.id] || []).join(", "),
  ];
});
writeFileSync(join(OUT, "tabela-nutricional.csv"), toCSV([nutHeader, ...nutRows]));

// ---- 2) Ficha técnica de produção (com custos a preencher) ----
const fichaHeader = [
  "Sabor", "Linha", "Rendimento", "Porção",
  "Ingrediente", "Quantidade", "Composição/Obs.",
  "Preço unitário (R$)", "Custo na receita (R$)",
];
const fichaRows = [];
for (const p of PRODUCTS) {
  p.ingredients.forEach((ing, i) => {
    fichaRows.push([
      i === 0 ? p.name : "", i === 0 ? cat(p.category) : "",
      i === 0 ? p.yield : "", i === 0 ? p.portionLabel : "",
      ing.name, ing.qty, ing.note || (ing.name.includes("Base") ? BASE : ""),
      "", "", // preço unitário e custo: preencher manualmente
    ]);
  });
  fichaRows.push(["", "", "", "", "", "", "", "TOTAL RECEITA", ""]); // linha de soma por sabor
}
writeFileSync(join(OUT, "ficha-tecnica.csv"), toCSV([fichaHeader, ...fichaRows]));

console.log(`OK  ${PRODUCTS.length} sabores`);
console.log(`  → public/tabela-nutricional.csv (${nutRows.length} linhas)`);
console.log(`  → public/ficha-tecnica.csv (${fichaRows.length} linhas)`);
