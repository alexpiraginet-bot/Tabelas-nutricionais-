// Gera public/llms.txt — o resumo do site para buscadores e assistentes de IA
// (formato llms.txt: título, resumo e listas de links em Markdown).
//
// Gerado no build a partir dos mesmos dados do site (src/data.js, lojas.js,
// eventos-regras.js, via src/ia/catalogo.js): reajuste de preço do evento ou
// tabela nova da nutricionista chegam aqui no mesmo deploy. Não edite o .txt.
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PRODUCTS, SHAKES } from "../src/data.js";
import { LOJAS } from "../src/lojas.js";
import { EV_FORMATOS, EV_PRECO_PESSOA, EV_MIN } from "../src/eventos-regras.js";
import { fatosSabor, alergicosShakeTexto, PEDIR_URL, STUDIO_URL, ZAP_LABEL } from "../src/ia/catalogo.js";

const SITE = "https://bentogelateria.com";
const n1 = (v) => String(Math.round(v * 10) / 10).replace(".", ",");
const linhaSabor = (p) => {
  const f = fatosSabor(p);
  const extra = [
    f.contem.length ? "contém " + f.contem.join(", ").toLowerCase() : "sem alérgicos declarados",
    f.contem_lactose ? "contém lactose" : "sem lactose",
    f.contem_gluten ? "contém glúten" : "sem glúten",
    ...f.alegacoes.map((a) => a.toLowerCase().replace(/\.\)$/, ")")),
    f.estimado ? "valores estimados" : null,
  ].filter(Boolean);
  return `- ${p.name} (${p.portionLabel}): ${n1(f.kcal)} kcal, ${n1(f.proteina_g)} g de proteína, ${n1(f.acucares_adicionados_g)} g de açúcares adicionados; ${extra.join("; ")}.`;
};

// Alegação de açúcar e de proteína só na linha do sabor que a tem (fatosSabor):
// nada de alegação para a linha inteira no resumo — Extra Dark, Maracujá e o
// Chocolate Dubai levam açúcar adicionado. scripts/test-ia.mjs trava isso.
export function montarLlmsTxt() {
  const out = [];
  out.push("# Bentô Gelatos");
  out.push("");
  out.push("> Gelateria funcional de Vitória-ES (Bentô Functional Nutrition · ABB Gelateria Ltda, CNPJ 61.590.463/0001-45): gelatos, picolés Bentôlé e shakes proteicos, em duas lojas, com pedido online e serviço para eventos.");
  out.push("");
  out.push("Valores nutricionais por porção, das fichas técnicas publicadas. As alegações de açúcar e de proteína valem sabor por sabor, como aparecem em cada linha abaixo: sabor sem alegação na linha não tem alegação. Produção compartilhada: todos os sabores podem conter traços de alérgicos. A disponibilidade de sabores varia por loja e por dia.");
  out.push("");
  out.push("## Pedir e visitar");
  out.push(`- [Pedido online](${PEDIR_URL}): entrega da nossa equipe ou retirada na loja, pagamento no Pix. Se a entrega está disponível, o raio e o pedido mínimo aparecem no próprio pedido, na hora.`);
  for (const l of LOJAS) out.push(`- Bentô ${l.nome}: ${l.endereco}. Horário: ${l.resumo.map(([d, h]) => d + " " + h).join(", ")}. [Mapa](${l.maps})`);
  out.push(`- WhatsApp da equipe: ${ZAP_LABEL}`);
  out.push(`- [Pergunte à Bentô IA](${SITE}/?ia): concierge do site, responde com o cardápio e as tabelas oficiais.`);
  out.push("");
  out.push("## Gelatos");
  for (const p of PRODUCTS.filter((p) => p.category === "gelato")) out.push(linhaSabor(p));
  out.push("");
  out.push("## Picolés Bentôlé");
  for (const p of PRODUCTS.filter((p) => p.category === "bentole" && !p.id.endsWith("-g"))) out.push(linhaSabor(p));
  out.push("- Também em tamanho G: o dobro do mini, com os valores em dobro.");
  out.push("");
  out.push("## Shakes proteicos");
  for (const s of SHAKES) out.push(`- ${s.name}: ${s.protein} g de proteína; ${s.nutrition.map((r) => `${r.liquid.toLowerCase()} ${r.kcal} kcal`).join(", ")}. Contém ${alergicosShakeTexto(s).toLowerCase()}.`);
  out.push("");
  out.push("## Eventos");
  out.push(`- R$ ${EV_PRECO_PESSOA} por pessoa em qualquer formato; logística e personalização à parte. Orçamento online a partir de ${EV_MIN} convidados: [Orçamento de evento](${SITE}/?eventos)`);
  for (const f of EV_FORMATOS) out.push(`- ${f.nome} (${f.max == null ? f.min + " convidados ou mais" : f.min + " a " + f.max + " convidados"}): ${f.servico}.`);
  out.push("");
  out.push("## Mais");
  out.push(`- [Tabelas nutricionais](${SITE}/?tabelas)`);
  out.push(`- [Tabela nutricional em CSV](${SITE}/tabela-nutricional.csv)`);
  out.push(`- [Bentô Meu Studio](${STUDIO_URL}): edições personalizadas com a sua marca.`);
  out.push(`- [Seja Bentô](${SITE}/seja-bento): revenda e franquia.`);
  out.push(`- [Trabalhe conosco](${SITE}/?vagas)`);
  out.push("");
  return out.join("\n");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await writeFile(new URL("../public/llms.txt", import.meta.url), montarLlmsTxt(), "utf8");
  console.log(`llms.txt gerado (${PRODUCTS.length} produtos, ${LOJAS.length} lojas).`);
}
