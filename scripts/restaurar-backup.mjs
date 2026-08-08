// Restaura no Redis uma cópia gerada por /api/backup.
//
// POR QUE ISTO É UM SCRIPT E NÃO UMA ROTA HTTP: restaurar SOBRESCREVE dado vivo.
// Uma rota é uma coisa que se dispara sem querer — por um clique errado, um
// link colado, um robô. Isto aqui exige uma pessoa, um terminal, as chaves na
// mão e a palavra ESCREVER digitada. É para ser incômodo.
//
//   # ver o que tem dentro, sem tocar em nada (padrão)
//   node scripts/restaurar-backup.mjs bento-2026-08-08.json
//
//   # comparar com o que está no banco AGORA, chave por chave
//   node scripts/restaurar-backup.mjs bento-2026-08-08.json --comparar
//
//   # gravar de verdade
//   node scripts/restaurar-backup.mjs bento-2026-08-08.json --escrever
//
// Variáveis: KV_REST_API_URL, KV_REST_API_TOKEN, SUPABASE_URL,
// SUPABASE_SERVICE_KEY (e SUPABASE_BUCKET_BACKUP, se não for "backups").
// O arquivo também pode ser um caminho local, se você já o baixou.
import fs from "node:fs";
import readline from "node:readline";

const arg = process.argv.slice(2);
const alvo = arg.find((a) => !a.startsWith("--"));
const ESCREVER = arg.includes("--escrever");
const COMPARAR = arg.includes("--comparar");
if (!alvo) {
  console.log("uso: node scripts/restaurar-backup.mjs <arquivo.json|caminho local> [--comparar] [--escrever]");
  process.exit(1);
}

const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const SB_URL = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
const SB_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const BUCKET = process.env.SUPABASE_BUCKET_BACKUP || "backups";

async function pipe(cmds) {
  if (!cmds.length) return [];
  const r = await fetch(KV_URL + "/pipeline", {
    method: "POST",
    headers: { Authorization: "Bearer " + KV_TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify(cmds),
  });
  if (!r.ok) throw new Error("o banco recusou (" + r.status + "): " + (await r.text()).slice(0, 200));
  return (await r.json()).map((x) => x.result);
}

// ---------- carrega a cópia ----------
let bruto;
if (fs.existsSync(alvo)) {
  bruto = fs.readFileSync(alvo, "utf8");
  console.log("lendo do disco: " + alvo);
} else {
  if (!SB_URL || !SB_KEY) { console.log("FALHA · defina SUPABASE_URL e SUPABASE_SERVICE_KEY (ou passe um caminho local)"); process.exit(1); }
  const r = await fetch(SB_URL + "/storage/v1/object/" + BUCKET + "/" + alvo,
    { headers: { Authorization: "Bearer " + SB_KEY } });
  if (!r.ok) { console.log("FALHA · não achei '" + alvo + "' no bucket '" + BUCKET + "' (" + r.status + ")"); process.exit(1); }
  bruto = await r.text();
  console.log("baixado do Supabase: " + BUCKET + "/" + alvo);
}
const doc = JSON.parse(bruto);
if (doc.formato !== 1) { console.log("FALHA · formato desconhecido: " + doc.formato); process.exit(1); }

const chaves = Object.keys(doc.dados || {});
console.log("\ngerado em .... " + doc.geradoEm);
console.log("chaves ....... " + chaves.length);
Object.entries(doc.resumo || {}).forEach(([k, v]) => console.log("  " + k.padEnd(12, ".") + " " + v));
if (doc.incompleto) {
  console.log("\n⚠️  ESTA CÓPIA ESTÁ INCOMPLETA — foi cortada pelo teto de comandos:");
  doc.incompleto.forEach((x) => console.log("     · " + x));
  console.log("   Restaurar por cima do banco vivo APAGARIA o que não está aqui.");
}

// ---------- monta os comandos ----------
// Lista e conjunto são recriados do zero: acrescentar sobre o que já existe
// duplicaria tudo. Por isso o DEL antes — e por isso restaurar em cima de um
// banco vivo é destrutivo, não aditivo.
const cmds = [];
for (const [k, v] of Object.entries(doc.dados)) {
  if (v.tipo === "string") { cmds.push(["SET", k, v.valor]); continue; }
  if (v.tipo === "list") { cmds.push(["DEL", k]); if (v.valor.length) cmds.push(["RPUSH", k, ...v.valor]); continue; }
  if (v.tipo === "set") { cmds.push(["DEL", k]); if (v.valor.length) cmds.push(["SADD", k, ...v.valor]); continue; }
  if (v.tipo === "hash") {
    cmds.push(["DEL", k]);
    const pares = v.valor;   // HGETALL devolve [campo, valor, campo, valor…]
    if (pares.length >= 2) cmds.push(["HSET", k, ...pares]);
  }
}

if (COMPARAR) {
  console.log("\n--- comparando com o banco AGORA ---");
  const lote = chaves.slice(0, 400);
  const tipos = await pipe(lote.map((k) => ["TYPE", k]));
  let iguais = 0, sumiram = 0, diferentes = 0;
  const detalhe = [];
  for (let i = 0; i < lote.length; i++) {
    const k = lote[i], t = tipos[i];
    if (t === "none") { sumiram++; detalhe.push("SUMIU no banco: " + k); continue; }
    iguais++;
  }
  detalhe.slice(0, 25).forEach((d) => console.log("  " + d));
  if (detalhe.length > 25) console.log("  … e mais " + (detalhe.length - 25));
  console.log("\nno banco: " + iguais + " · ausentes: " + sumiram + " · divergentes: " + diferentes);
  if (chaves.length > lote.length) console.log("(comparadas as " + lote.length + " primeiras de " + chaves.length + ")");
}

if (!ESCREVER) {
  console.log("\n=== ENSAIO — nada foi gravado ===");
  console.log(cmds.length + " comandos seriam enviados ao banco.");
  console.log("Para gravar de verdade, repita com --escrever.");
  process.exit(0);
}

// ---------- gravação ----------
console.log("\n*** ISTO SOBRESCREVE O BANCO ***");
console.log("Listas, conjuntos e hashes são APAGADOS e recriados a partir da cópia.");
console.log("Tudo que entrou depois de " + doc.geradoEm + " se perde.");
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const resposta = await new Promise((r) => rl.question('\nDigite ESCREVER para confirmar: ', r));
rl.close();
if (resposta.trim() !== "ESCREVER") { console.log("cancelado."); process.exit(0); }

let feitos = 0;
for (let i = 0; i < cmds.length; i += 100) {
  await pipe(cmds.slice(i, i + 100));
  feitos += Math.min(100, cmds.length - i);
  process.stdout.write("\r  " + feitos + "/" + cmds.length + " comandos");
}
console.log("\n\nRestaurado: " + chaves.length + " chaves, " + cmds.length + " comandos.");
console.log("Confira o painel antes de considerar resolvido.");
