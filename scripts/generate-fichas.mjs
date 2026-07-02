// Gera planilhas (CSV) e o JSON do painel de fichas a partir da fonte única src/data.js
//   - public/tabela-nutricional.csv : 1 linha por sabor, com toda a tabela nutricional
//   - public/ficha-tecnica.csv      : 1 linha por ingrediente, com colunas de custo p/ preencher
//   - public/fichas-data.json       : base de dados do painel /fichas.html (nutri & P&D)
// Uso: npm run fichas
import { PRODUCTS, SHAKES, BASE, ALLERGENS, PODE_CONTER, sugarClaim, proteinClaim, lupaFrontal, AVISO_POLIOL, FRASE_ACUCARES_PROPRIOS } from "../src/data.js";
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
  "Alegação de açúcares (RDC 54/2012)", "Frase complementar obrigatória",
  "Alegação de proteína (RDC 54/2012)", "Lupa frontal (RDC 429/2020)",
  "Advertência polióis (RDC 727/2022)", "Valores estimados (confirmar em laboratório)",
];
const nutRows = PRODUCTS.map((p) => {
  const n = p.nutrition;
  const sc = sugarClaim(p);
  return [
    p.name, cat(p.category), p.portionLabel, p.yield,
    n.kcal, n.carbs, n.sugars, n.addedSugars, n.protein, n.fat, n.satFat,
    n.transFat, n.fiber, n.sodium, p.flags.gluten ? "sim" : "não", p.flags.lactose ? "sim" : "não",
    (ALLERGENS[p.id] || []).join(", "),
    sc ? sc.label : "NÃO ALEGAR (contém açúcares adicionados)",
    sc && sc.note ? sc.note : "",
    proteinClaim(p) || "",
    lupaFrontal(p).join(", ") || "não se aplica",
    p.hasPolyols ? AVISO_POLIOL : "não detectado nas composições declaradas (insumos sem ficha: ver PENDENTE-AUDITORIA em src/data.js)",
    p.estimated ? "SIM — não usar em rótulo sem análise" : "não",
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

// ---- 3) JSON do painel de fichas (/fichas.html) ----
const fichasData = {
  avisoPoliol: AVISO_POLIOL,
  fraseAcucaresProprios: FRASE_ACUCARES_PROPRIOS,
  podeConter: PODE_CONTER,
  products: PRODUCTS.map((p) => {
    const sc = sugarClaim(p);
    return {
      id: p.id, name: p.name, category: p.category, linha: cat(p.category),
      serving: p.serving, portionLabel: p.portionLabel, yield: p.yield,
      estimated: !!p.estimated, hasPolyols: !!p.hasPolyols,
      ingredients: p.ingredients.map((i) => ({ name: i.name, qty: i.qty, note: i.note || "" })),
      nutrition: p.nutrition,
      allergens: ALLERGENS[p.id] || [],
      flags: p.flags,
      claims: {
        sugar: sc ? sc.label : null, sugarNote: sc && sc.note ? sc.note : null,
        protein: proteinClaim(p), lupa: lupaFrontal(p),
      },
    };
  }),
  shakes: SHAKES.map((s) => ({
    id: s.id, code: s.code, name: s.name, emoji: s.emoji,
    category: "shake", linha: "Shake (preparado na hora)",
    description: s.description, sub: s.sub, prep: s.prep, protein: s.protein,
    ingredients: s.ingredients.map((i) => ({ name: i.name, qty: i.qty, note: i.note || "" })),
    nutrition: s.nutrition,
  })),
};
writeFileSync(join(OUT, "fichas-data.json"), JSON.stringify(fichasData, null, 1));

console.log(`OK  ${PRODUCTS.length} sabores + ${SHAKES.length} shakes`);
console.log(`  → public/tabela-nutricional.csv (${nutRows.length} linhas)`);
console.log(`  → public/ficha-tecnica.csv (${fichaRows.length} linhas)`);
console.log(`  → public/fichas-data.json (${fichasData.products.length} SKUs + ${fichasData.shakes.length} shakes)`);
