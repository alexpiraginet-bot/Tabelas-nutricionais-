// Roda os quatro scripts de transição do contrato num Redis DE VERDADE.
//
// POR QUE ISTO EXISTE: o teste do api/contrato.js sobe um Redis falso em
// JavaScript, e um Redis falso não interpreta Lua — ele reconhece o script pelo
// rótulo e executa a semântica equivalente em JS. Quer dizer: um erro de Lua
// passa por ele inteiro, com 117 PASS na tela, e só aparece em produção.
//
// Já aconteceu: as linhas dos scripts eram juntadas com ESPAÇO, e "--" em Lua
// comenta até o fim da LINHA. O rótulo do começo comentava o script todo, todo
// EVAL devolvia nada, e nenhum teste piscou. Este arquivo é a resposta a isso —
// aqui o Lua é o Lua.
import { execFileSync, spawn } from "node:child_process";
import net from "node:net";
import { LUA_CAS, LUA_ASSINA, LUA_RELINK, LUA_DERIVA, SEM_CHAVE } from "../api/contrato.js";

const porta = await new Promise((r) => {
  const s = net.createServer();
  s.listen(0, () => { const p = s.address().port; s.close(() => r(p)); });
});
const redis = spawn("redis-server", ["--port", String(porta), "--save", "", "--appendonly", "no"],
  { stdio: "ignore" });
process.on("exit", () => redis.kill());

const cli = (...args) => execFileSync("redis-cli", ["-p", String(porta), ...args], { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
for (let i = 0; i < 50; i++) {
  try { if (cli("PING") === "PONG") break; } catch { /* ainda subindo */ }
  await new Promise((r) => setTimeout(r, 100));
}
if (cli("PING") !== "PONG") { console.log("FALHA · redis-server não subiu"); process.exit(1); }

const ok = (c, m) => console.log((c ? "PASS" : "FALHA") + " · " + m);
const evalua = (script, chaves, args) =>
  cli("EVAL", script, String(chaves.length), ...chaves, ...args);
const zera = () => cli("FLUSHALL");

// ---------- LUA_CAS (pedir-ajuste) ----------
zera();
cli("SET", "doc", "v1");
ok(evalua(LUA_CAS, ["doc", "ass"], ["v1", "v2"]) === "1", "CAS grava quando o documento é o esperado");
ok(cli("GET", "doc") === "v2", "e o valor novo ficou gravado");
ok(evalua(LUA_CAS, ["doc", "ass"], ["v1", "v3"]) === "0", "CAS recusa quando o documento mudou");
ok(cli("GET", "doc") === "v2", "e NÃO gravou por cima");
cli("SET", "ass", "{}");
ok(evalua(LUA_CAS, ["doc", "ass"], ["v2", "v4"]) === "-1", "CAS devolve -1 quando já há assinatura");
ok(cli("GET", "doc") === "v2", "contrato assinado não é alterado");

// ---------- LUA_ASSINA ----------
zera();
cli("SET", "doc", "antes");
cli("SET", "tok", "id-1");
ok(evalua(LUA_ASSINA, ["doc", "ass", "tok"], ["antes", "depois", '{"nome":"X"}']) === "1", "ASSINA registra");
ok(cli("GET", "ass") === '{"nome":"X"}', "a assinatura ficou na chave própria");
ok(cli("GET", "doc") === "depois", "o documento foi atualizado no MESMO comando");
ok(cli("EXISTS", "tok") === "0", "e o link foi queimado no MESMO comando");
ok(evalua(LUA_ASSINA, ["doc", "ass", "tok"], ["depois", "outro", "{}"]) === "-1", "segunda assinatura -> -1");
ok(cli("GET", "ass") === '{"nome":"X"}', "a primeira assinatura continua intacta");
zera();
cli("SET", "doc", "antes");
ok(evalua(LUA_ASSINA, ["doc", "ass", "tok"], ["OUTRO", "depois", "{}"]) === "0", "ASSINA recusa documento trocado");
ok(cli("EXISTS", "ass") === "0", "e nada foi gravado");

// ---------- LUA_RELINK (novo-link) ----------
zera();
cli("SET", "doc", "d1"); cli("SET", "tokA", "id-1");
ok(evalua(LUA_RELINK, ["doc", "ass", "tokA", "tokB"], ["d1", "d2", "id-1", "120"]) === "1", "RELINK troca o link");
ok(cli("EXISTS", "tokA") === "0" && cli("GET", "tokB") === "id-1", "o link antigo morre e o novo nasce juntos");
ok(Number(cli("TTL", "tokB")) > 0, "o link novo nasce com prazo (TTL " + cli("TTL", "tokB") + "s)");
ok(cli("GET", "doc") === "d2", "documento atualizado na mesma transição");
cli("SET", "ass", "{}");
ok(evalua(LUA_RELINK, ["doc", "ass", "tokB", "tokC"], ["d2", "d3", "id-1", "120"]) === "-1", "contrato assinado não reemite");
ok(cli("EXISTS", "tokB") === "1", "e o link existente não foi tocado");

// ---------- LUA_DERIVA ----------
const chavesDeriva = (vig) => ["origem", "origemAss", "origemTok", "novo", "novoTok",
  vig ? "vig" : SEM_CHAVE, vig ? "vigAss" : SEM_CHAVE, vig ? "vigTok" : SEM_CHAVE, "lista"];

zera();
cli("SET", "origem", "o1"); cli("SET", "origemTok", "id-o");
ok(evalua(LUA_DERIVA, chavesDeriva(false), ["o1", "o2", "n1", "id-n", "", "", "120"]) === "1",
   "DERIVA sem versão vigente");
ok(cli("GET", "novo") === "n1" && cli("GET", "novoTok") === "id-n", "contrato novo criado JÁ com link");
ok(Number(cli("TTL", "novoTok")) > 0, "link novo com prazo");
ok(cli("GET", "origem") === "o2" && cli("EXISTS", "origemTok") === "0", "origem atualizada e link dela morto");
ok(cli("LRANGE", "lista", "0", "-1") === "id-n", "o contrato novo entrou na lista");

zera();
cli("SET", "origem", "o1"); cli("SET", "vig", "v1"); cli("SET", "vigTok", "id-v");
ok(evalua(LUA_DERIVA, chavesDeriva(true), ["o1", "o2", "n1", "id-n", "v1", "v2", "120"]) === "1",
   "DERIVA encerrando a versão vigente");
ok(cli("GET", "vig") === "v2" && cli("EXISTS", "vigTok") === "0",
   "a vigente foi encerrada e o link dela morreu — não ficam dois textos assináveis");
ok(cli("GET", "novoTok") === "id-n", "e o link da versão nova nasceu na mesma transição");

zera();
cli("SET", "origem", "o1"); cli("SET", "vig", "v1"); cli("SET", "vigAss", "{}");
ok(evalua(LUA_DERIVA, chavesDeriva(true), ["o1", "o2", "n1", "id-n", "v1", "v2", "120"]) === "-1",
   "vigente JÁ ASSINADA -> -1 (não encerra contrato assinado)");
ok(cli("GET", "vig") === "v1" && cli("EXISTS", "novo") === "0" && cli("EXISTS", "novoTok") === "0",
   "e NADA foi criado nem alterado — tudo ou nada");

zera();
cli("SET", "origem", "o1"); cli("SET", "origemAss", "{}");
ok(evalua(LUA_DERIVA, chavesDeriva(false), ["o1", "o2", "n1", "id-n", "", "", "120"]) === "-2",
   "origem JÁ ASSINADA -> -2");
ok(cli("EXISTS", "novo") === "0", "e nenhum contrato foi criado");

zera();
cli("SET", "origem", "mudou");
ok(evalua(LUA_DERIVA, chavesDeriva(false), ["o1", "o2", "n1", "id-n", "", "", "120"]) === "0",
   "origem alterada no caminho -> 0");
ok(cli("EXISTS", "novo") === "0" && cli("EXISTS", "novoTok") === "0", "e nada meio-feito ficou para trás");

// A ordem das checagens tem de fazer a mensagem certa chegar: assinatura ANTES
// do documento. Invertido, toda corrida virava "mudou no caminho".
zera();
cli("SET", "doc", "outro"); cli("SET", "ass", "{}");
ok(evalua(LUA_ASSINA, ["doc", "ass", "tok"], ["esperado", "novo", "{}"]) === "-1",
   "com assinatura E documento diferentes, a resposta é 'já assinado', não 'mudou'");

redis.kill();
console.log("\nScripts Lua do contrato: rodados em Redis de verdade.");
