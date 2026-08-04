// Gera public/painel-padroes.js a partir de src/lojas.js — o horário que o
// formulário do painel admin mostra quando ainda não há config salva.
//
// POR QUE ISTO EXISTE (custou um dia de loja fechada):
// O painel é HTML+JS puro, servido estático, sem build e sem import. O horário
// das lojas vive no código do site. Enquanto as duas pontas não se falavam, o
// painel tinha uma CÓPIA MANUAL dos horários — e cópia manual diverge calada.
// Pior: o formulário chegou a abrir vazio, e vazio significa "fechado", então
// um salvar sem edição gravou a semana inteira fechada nas duas lojas.
//
// Agora o painel não tem horário escrito: ele carrega este arquivo, gerado do
// mesmo lugar que o site lê. Divergir deixou de ser possível.
//
// Roda antes do vite build (npm run build). O arquivo é gerado, não editado à
// mão — está no .gitignore.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { LOJAS } from "../src/lojas.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DESTINO = join(ROOT, "public", "painel-padroes.js");

// Só o que o painel precisa: id → dias. Nome, endereço e iFood não são editáveis
// por lá, então não vão junto — menos superfície, menos coisa para desencontrar.
const dias = {};
for (const l of LOJAS) {
  if (!l || !l.id || !l.dias) continue;
  dias[l.id] = l.dias;
}

const nomes = Object.keys(dias);
if (nomes.length === 0) {
  console.error("generate-painel-padroes: nenhuma loja com horário em src/lojas.js — abortando");
  process.exit(1);
}
// Trava: loja sem NENHUM dia aberto é o mesmo defeito que fechou o site.
// Se isso aparecer no código-fonte, é bug — não deixa passar para o painel.
for (const [id, d] of Object.entries(dias)) {
  const aberto = Object.values(d).some((p) => Array.isArray(p) && p.length === 2);
  if (!aberto) {
    console.error(`generate-painel-padroes: loja "${id}" está sem nenhum dia aberto em src/lojas.js — abortando`);
    process.exit(1);
  }
}

const js = `// GERADO por scripts/generate-painel-padroes.mjs — não edite à mão.
// Fonte: src/lojas.js. Para mudar horário, mude lá e rode o build.
window.SC_LOJAS_PADRAO = {
${Object.entries(dias).map(([id, d]) => `  ${JSON.stringify(id)}: ${JSON.stringify(d)}`).join(",\n")}
};
`;

writeFileSync(DESTINO, js, "utf8");
console.log(`OK  painel-padroes.js gerado de src/lojas.js — ${nomes.length} lojas: ${nomes.join(", ")}`);
