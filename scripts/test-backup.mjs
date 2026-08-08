// Prova de ida e volta do backup, contra um Redis DE VERDADE.
//
// Backup só vale se restaurar. Um teste que verifica "o arquivo foi gravado"
// não prova nada — o que precisa ser provado é: enche o banco, copia, APAGA
// TUDO, restaura da cópia, e o banco volta idêntico ao que era. É o que este
// arquivo faz, com redis-server real e o api/backup.js real; de falso só o
// Supabase, que aqui guarda o arquivo na memória.
import http from "node:http";
import net from "node:net";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const ok = (c, m) => console.log((c ? "PASS" : "FALHA") + " · " + m);
const porta = async () => new Promise((r) => {
  const s = net.createServer(); s.listen(0, () => { const p = s.address().port; s.close(() => r(p)); });
});

// ---------- cliente RESP mínimo (respostas com tipo exato, sem parsear texto) ----------
function resp(cmd) {
  return "*" + cmd.length + "\r\n" + cmd.map((a) => {
    const s = String(a); return "$" + Buffer.byteLength(s) + "\r\n" + s + "\r\n";
  }).join("");
}
// O corte é em BYTES, então o parser trabalha em Buffer. Com string, "Vitória"
// (byte ≠ caractere) desalinha o corte e a leitura trava para sempre.
function leUm(buf, i) {
  const fim = buf.indexOf("\r\n", i);
  if (fim < 0) return null;
  const t = String.fromCharCode(buf[i]);
  const corpo = buf.toString("utf8", i + 1, fim);
  if (t === "+") return { v: corpo, i: fim + 2 };
  if (t === "-") return { v: { erro: corpo }, i: fim + 2 };
  if (t === ":") return { v: Number(corpo), i: fim + 2 };
  if (t === "$") {
    const n = Number(corpo);
    if (n === -1) return { v: null, i: fim + 2 };
    if (buf.length < fim + 2 + n + 2) return null;
    return { v: buf.toString("utf8", fim + 2, fim + 2 + n), i: fim + 2 + n + 2 };
  }
  if (t === "*") {
    const n = Number(corpo);
    if (n === -1) return { v: null, i: fim + 2 };
    let j = fim + 2; const saida = [];
    for (let k = 0; k < n; k++) { const r = leUm(buf, j); if (!r) return null; saida.push(r.v); j = r.i; }
    return { v: saida, i: j };
  }
  return null;
}
function abreRedis(p) {
  const sock = net.connect(p, "127.0.0.1");
  let buf = Buffer.alloc(0), fila = [];
  sock.on("error", () => {});
  sock.on("data", (d) => {
    buf = Buffer.concat([buf, d]);
    for (;;) {
      const r = leUm(buf, 0);
      if (!r) break;
      buf = buf.subarray(r.i);
      const f = fila.shift(); if (f) f(r.v);
    }
  });
  return {
    pronto: new Promise((r) => sock.on("connect", r)),
    manda: (cmd) => new Promise((r) => { fila.push(r); sock.write(resp(cmd)); }),
    fecha: () => sock.end(),
  };
}

// ---------- sobe o Redis ----------
const pRedis = await porta();
const redis = spawn("redis-server", ["--port", String(pRedis), "--save", "", "--appendonly", "no"], { stdio: "ignore" });
process.on("exit", () => { try { redis.kill(); } catch { /* */ } });
// espera o redis aceitar conexão ANTES de abrir a nossa (conectar cedo derruba
// o processo com ECONNREFUSED, que não dá para pegar com try/catch)
for (let i = 0; i < 80; i++) {
  const vivo = await new Promise((r) => {
    const s = net.connect(pRedis, "127.0.0.1");
    s.on("connect", () => { s.destroy(); r(true); });
    s.on("error", () => r(false));
  });
  if (vivo) break;
  await new Promise((r) => setTimeout(r, 100));
}
const R = abreRedis(pRedis);
await R.pronto;
if ((await R.manda(["PING"])) !== "PONG") { console.log("FALHA · redis-server não respondeu"); process.exit(1); }

// ---------- shim REST da Upstash sobre o Redis real ----------
const pShim = await porta();
const shim = http.createServer((q, s) => {
  let b = ""; q.on("data", (c) => (b += c)); q.on("end", async () => {
    const corpo = JSON.parse(b || "[]");
    const pipeline = q.url.includes("/pipeline");
    const cmds = pipeline ? corpo : [corpo];
    const saida = [];
    for (const c of cmds) saida.push({ result: await R.manda(c) });
    s.setHeader("content-type", "application/json");
    s.end(JSON.stringify(pipeline ? saida : saida[0]));
  });
});
await new Promise((r) => shim.listen(pShim, r));

// ---------- Supabase de mentira: guarda o arquivo na memória ----------
const arquivos = new Map();
const pSb = await porta();
const sb = http.createServer((q, s) => {
  let b = ""; q.on("data", (c) => (b += c)); q.on("end", () => {
    s.setHeader("content-type", "application/json");
    if (q.url.startsWith("/storage/v1/bucket/")) { s.end(JSON.stringify({ name: "backups", public: false })); return; }
    if (q.url.startsWith("/storage/v1/object/list/")) {
      s.end(JSON.stringify([...arquivos.entries()].map(([n, v]) => ({ name: n, metadata: { size: v.length } })))); return;
    }
    const m = q.url.match(/^\/storage\/v1\/object\/backups\/(.+)$/);
    if (m && q.method === "POST") { arquivos.set(decodeURIComponent(m[1]), b); s.end(JSON.stringify({ Key: m[1] })); return; }
    s.statusCode = 404; s.end("{}");
  });
});
await new Promise((r) => sb.listen(pSb, r));

process.env.KV_REST_API_URL = "http://127.0.0.1:" + pShim;
process.env.KV_REST_API_TOKEN = "x";
process.env.SUPABASE_URL = "http://127.0.0.1:" + pSb;
process.env.SUPABASE_SERVICE_KEY = "y";
process.env.PANEL_KEY = "senha-de-teste";

// ---------- povoa o banco com um retrato do que o painel guarda ----------
const lead = (n) => JSON.stringify({ ts: 1700000000000 + n, nome: "Cliente " + n, zap: "279999" + n, cidade: "Vitória" });
await R.manda(["RPUSH", "leads", lead(1), lead(2), lead(3)]);
await R.manda(["SET", "leads:count", "3"]);
await R.manda(["SET", "site:config", JSON.stringify({ lojas: { "praia-do-canto": { dias: { 1: [11, 20] } } } })]);
await R.manda(["SET", "home:destaque", "eventos"]);
await R.manda(["HSET", "booked", "2026-12-20", "18:00", "2026-12-25", "reservado"]);
await R.manda(["RPUSH", "prevendas", JSON.stringify({ nome: "Ana" })]);
await R.manda(["SET", "prevendas:count", "1"]);
await R.manda(["RPUSH", "sorteio", JSON.stringify({ nome: "Bruno" })]);
await R.manda(["RPUSH", "vagas", JSON.stringify({ nome: "Carla" })]);
await R.manda(["RPUSH", "sejabento", JSON.stringify({ nome: "Diego" })]);
// clube: conjunto de telefones + documento, indicados e códigos de cada um
await R.manda(["SADD", "clube:phones", "27999990001", "27999990002"]);
await R.manda(["SET", "clube:27999990001", JSON.stringify({ nome: "Eva", selos: 4 })]);
await R.manda(["SADD", "clube:ind:27999990001", "27988880000"]);
await R.manda(["HSET", "clube:cod:27999990001", "casquinha", "ABC123"]);
await R.manda(["SET", "clube:27999990002", JSON.stringify({ nome: "Ovo", selos: 1 })]);
// contratos: documento, cadeia de eventos e AS DUAS assinaturas
await R.manda(["RPUSH", "contratos", "ct1", "ct2"]);
await R.manda(["SET", "contrato:ct1", JSON.stringify({ id: "ct1", status: "assinado", snapshot: { nome: "Renata", total: 3000 } })]);
await R.manda(["RPUSH", "contrato:ct1:eventos", JSON.stringify({ tipo: "criacao" }), JSON.stringify({ tipo: "assinatura" })]);
await R.manda(["SET", "contrato:ct1:assinatura", JSON.stringify({ nomeDigitado: "Renata Alves", ip: "201.1.1.1" })]);
await R.manda(["SET", "contrato:ct1:contratada", JSON.stringify({ porNome: "Alex Piraginet" })]);
await R.manda(["SET", "contrato:ct2", JSON.stringify({ id: "ct2", status: "aguardando" })]);
// lixo com prazo, que NÃO deve entrar na cópia
await R.manda(["SET", "contrato:tok:abc", "ct2"]);
await R.manda(["SET", "ev:d:1.2.3.4", "9"]);

const antes = {};
for (const k of ["leads", "prevendas", "sorteio", "vagas", "sejabento", "contratos", "contrato:ct1:eventos"]) antes[k] = await R.manda(["LRANGE", k, 0, -1]);
for (const k of ["leads:count", "site:config", "home:destaque", "clube:27999990001", "contrato:ct1", "contrato:ct1:assinatura", "contrato:ct1:contratada", "contrato:ct2"]) antes[k] = await R.manda(["GET", k]);
antes["booked"] = await R.manda(["HGETALL", "booked"]);
antes["clube:phones"] = (await R.manda(["SMEMBERS", "clube:phones"])).sort();
antes["clube:ind:27999990001"] = await R.manda(["SMEMBERS", "clube:ind:27999990001"]);
antes["clube:cod:27999990001"] = await R.manda(["HGETALL", "clube:cod:27999990001"]);

// ---------- roda o backup DE VERDADE ----------
const { default: backup } = await import("../api/backup.js");
const chama = (req) => new Promise((resolve) => {
  const res = { statusCode: 200, setHeader() {}, status(c) { this.statusCode = c; return this; },
                json(j) { resolve({ status: this.statusCode, body: j }); }, end() { resolve({ status: this.statusCode }); } };
  backup(req, res);
});

let r = await chama({ method: "GET", query: {}, headers: {} });
ok(r.status === 401, "backup sem chave -> 401");

r = await chama({ method: "POST", query: {}, headers: { authorization: "Bearer senha-de-teste" } });
ok(r.status === 200 && r.body.ok, "backup roda e grava (" + (r.body.arquivo || r.body.error) + ")");
ok(arquivos.size === 1, "um arquivo no bucket");
const nome = [...arquivos.keys()][0];
ok(/^bento-\d{4}-\d{2}-\d{2}\.json$/.test(nome), "nome com a data do dia: " + nome);

const doc = JSON.parse(arquivos.get(nome));
ok(doc.resumo.leads === 3 && doc.resumo.contratos === 2 && doc.resumo.clube === 2,
   "resumo bate: " + doc.resumo.leads + " leads, " + doc.resumo.contratos + " contratos, " + doc.resumo.clube + " no clube");
ok(!!doc.dados["contrato:ct1:assinatura"], "a ASSINATURA do cliente entrou na cópia");
ok(!!doc.dados["contrato:ct1:contratada"], "a assinatura da Bentô entrou na cópia");
ok(!!doc.dados["contrato:ct1:eventos"], "a cadeia de eventos entrou na cópia");
ok(!!doc.dados["clube:cod:27999990001"], "os códigos do clube entraram na cópia");
ok(!doc.dados["contrato:tok:abc"] && !doc.dados["ev:d:1.2.3.4"], "lixo com prazo ficou de fora, de propósito");
ok(!doc.incompleto, "cópia marcada como completa");

// ---------- o teste que vale: apaga tudo e restaura ----------
await R.manda(["FLUSHALL"]);
ok((await R.manda(["DBSIZE"])) === 0, "banco APAGADO (simulando o pior dia possível)");

const tmp = path.join(os.tmpdir(), nome);
fs.writeFileSync(tmp, arquivos.get(nome));
// ASSÍNCRONO, obrigatoriamente: o script de restauração é um processo filho que
// vai pedir dados ao shim HTTP — e o shim roda AQUI. Com execFileSync o pai fica
// bloqueado, não atende o filho, e os dois esperam um pelo outro para sempre.
const saida = await new Promise((resolve, reject) => {
  const f = spawn("node", ["scripts/restaurar-backup.mjs", tmp, "--escrever"], {
    env: { ...process.env, KV_REST_API_URL: "http://127.0.0.1:" + pShim, KV_REST_API_TOKEN: "x" },
  });
  let out = "";
  f.stdout.on("data", (d) => (out += d));
  f.stderr.on("data", (d) => (out += d));
  f.on("close", () => resolve(out));
  f.on("error", reject);
  f.stdin.write("ESCREVER\n"); f.stdin.end();
});
ok(/Restaurado: \d+ chaves/.test(saida), "a restauração rodou até o fim");

let iguais = 0, diferentes = [];
for (const [k, v] of Object.entries(antes)) {
  let agora;
  if (Array.isArray(v) && ["booked", "clube:cod:27999990001"].includes(k)) agora = await R.manda(["HGETALL", k]);
  else if (k === "clube:phones" || k === "clube:ind:27999990001") agora = (await R.manda(["SMEMBERS", k])).sort();
  else if (Array.isArray(v)) agora = await R.manda(["LRANGE", k, 0, -1]);
  else agora = await R.manda(["GET", k]);
  const a = JSON.stringify(Array.isArray(v) && ["booked", "clube:cod:27999990001"].includes(k) ? [...v].sort() : v);
  const b = JSON.stringify(Array.isArray(agora) && ["booked", "clube:cod:27999990001"].includes(k) ? [...agora].sort() : agora);
  if (a === b) iguais++; else diferentes.push(k);
}
ok(diferentes.length === 0, "TUDO voltou idêntico: " + iguais + " chaves conferidas"
   + (diferentes.length ? " · divergiram: " + diferentes.join(", ") : ""));

// ---------- o banco recusando: NÃO pode gravar cópia pela metade ----------
arquivos.clear();
shim.close();
r = await chama({ method: "POST", query: {}, headers: { authorization: "Bearer senha-de-teste" } });
ok(r.status === 500 && !r.body.ok, "banco fora do ar -> backup FALHA em vez de fingir");
ok(arquivos.size === 0, "e NENHUM arquivo é gravado — cópia vazia por cima da boa seria o desastre");

R.fecha(); redis.kill(); sb.close();
console.log("\nBackup: ida e volta provada em Redis de verdade.");
