// Grava 1 clique no Redis (Upstash / Vercel KV) via REST — sem dependências.
// Endpoint público de escrita: recebe { n: "nome do evento" } e incrementa contadores.
// Nunca quebra a experiência do usuário: qualquer erro responde 204 silenciosamente.

const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

// Data de hoje no fuso de São Paulo (YYYY-MM-DD)
function diaSP() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

function readRaw(req) {
  if (req.body !== undefined && req.body !== null) return Promise.resolve(req.body);
  return new Promise((resolve) => {
    let d = "";
    req.on("data", (c) => { d += c; if (d.length > 4096) d = d.slice(0, 4096); });
    req.on("end", () => resolve(d));
    req.on("error", () => resolve(""));
  });
}

// Remove caracteres de controle (códigos < 32) sem afetar espaços/acentos/pontuação.
function semControle(s) {
  let out = "";
  for (const ch of s) if (ch.codePointAt(0) >= 32) out += ch;
  return out;
}

// Allowlist: letras, números, espaço e pontuação usada nos nomes de evento.
const SEGURO = /^[\p{L}\p{N} ·:%()&!+\-/.,'ª°]+$/u;

async function pipeline(cmds) {
  const r = await fetch(KV_URL + "/pipeline", {
    method: "POST",
    headers: { Authorization: "Bearer " + KV_TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify(cmds),
  });
  if (!r.ok) throw new Error("kv " + r.status);
  return r.json();
}

export default async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).end(); return; }
  // Banco ainda não configurado: ignora sem erro (o site segue funcionando).
  if (!KV_URL || !KV_TOKEN) { res.status(204).end(); return; }
  try {
    let body = await readRaw(req);
    if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
    if (!body || typeof body !== "object") body = {};

    const name = semControle((body.n || "").toString().trim()).slice(0, 60);
    if (!name || !SEGURO.test(name)) { res.status(204).end(); return; }

    const dia = diaSP();
    await pipeline([
      ["SADD", "ev:names", name],
      ["SADD", "ev:days", dia],
      ["INCR", "ev:t:" + name],
      ["INCR", "ev:d:" + dia + ":" + name],
    ]);
    res.status(204).end();
  } catch {
    res.status(204).end();
  }
}
