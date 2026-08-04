// Trava o caminho do horário até o painel admin.
//
// O gerador (generate-painel-padroes.mjs) elimina a cópia manual, mas só entrega
// o que promete se as pontas continuarem ligadas: o painel tem de CARREGAR o
// arquivo gerado e não pode voltar a ter horário escrito no meio do HTML. Este
// teste garante as duas coisas — e que o resultado bate com src/lojas.js.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { LOJAS } from "../src/lojas.js";

const [painel, gerado] = await Promise.all([
  readFile(new URL("../public/painel.html", import.meta.url), "utf8"),
  readFile(new URL("../public/painel-padroes.js", import.meta.url), "utf8").catch(() => null),
]);

assert.ok(gerado, "public/painel-padroes.js não existe — rode `npm run build` (ou o gerador) antes");

// 1. o painel carrega o gerado, e ANTES do próprio script
const iTag = painel.indexOf('src="/painel-padroes.js"');
assert.ok(iTag > 0, "painel.html não carrega /painel-padroes.js");
// o uso REAL (não a menção em comentário) tem de vir depois da tag
const iUso = painel.indexOf("window.SC_LOJAS_PADRAO ||");
assert.ok(iUso > 0, "painel.html não lê window.SC_LOJAS_PADRAO");
assert.ok(iTag < iUso, "o <script> de painel-padroes.js precisa vir antes do script do painel");

// 2. o painel NÃO tem horário escrito à mão (era a cópia que divergia)
const escrito = painel.match(/SC_LOJAS_PADRAO\s*=\s*\{[^}]*\d+\s*:\s*\[/);
assert.equal(escrito, null, "painel.html voltou a ter horário escrito à mão — o horário deve vir só de src/lojas.js");

// 3. o gerado bate, loja a loja e dia a dia, com src/lojas.js
const m = gerado.match(/window\.SC_LOJAS_PADRAO\s*=\s*([\s\S]*?);\s*$/);
assert.ok(m, "painel-padroes.js não tem o formato esperado");
const doPainel = JSON.parse(m[1]);
const doCodigo = Object.fromEntries(LOJAS.map((l) => [l.id, l.dias]));
assert.deepEqual(doPainel, JSON.parse(JSON.stringify(doCodigo)), "horário do painel divergiu de src/lojas.js");

// 4. nenhuma loja com a semana inteira fechada — foi esse valor que tirou as
//    duas lojas do ar; se aparecer na fonte, é bug e o teste tem de gritar
for (const [id, dias] of Object.entries(doPainel)) {
  const aberto = Object.values(dias).some((p) => Array.isArray(p) && p.length === 2);
  assert.ok(aberto, `loja "${id}" está sem nenhum dia aberto`);
}

const n = Object.keys(doPainel).length;
console.log(`Horário do painel travado em src/lojas.js: ${n} lojas, ${n * 7} dias conferidos.`);
