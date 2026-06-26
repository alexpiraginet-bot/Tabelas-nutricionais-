// Tela de retirada da loja: lista SÓ as pré-vendas marcadas como "pago" no painel,
// para os atendentes liberarem. GET/POST protegidos por PANEL_KEY ou LOJA_KEY.
import crypto from "node:crypto";

function findKV() {
  let url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  let token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    for (const k of Object.keys(process.env)) {
      if (!url && /REST_API_URL$/.test(k)) url = process.env[k];
      if (!token && /REST_API_TOKEN$/.test(k) && !/READ_ONLY/.test(k)) token = process.env[k];
    }
  }
  return { url, token };
}
const { url: KV_URL, token: KV_TOKEN } = findKV();
const PANEL_KEY = process.env.PANEL_KEY;
const LOJA_KEY = process.env.LOJA_KEY; // opcional: senha mais simples só p/ a loja

function getKey(req) {
  const h = req.headers.authorization || "";
  if (h.startsWith("Bearer ")) return h.slice(7);
  return (req.query && req.query.key ? req.query.key : "").toString();
}
function eq(a, b) {
  if (!a || !b) return false;
  const ab = Buffer.from(String(a)), bb = Buffer.from(String(b));
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}
function authed(req) {
  const k = getKey(req);
  return eq(k, PANEL_KEY) || eq(k, LOJA_KEY);
}
function readRaw(req) {
  if (req.body !== undefined && req.body !== null) return Promise.resolve(req.body);
  return new Promise((resolve) => {
    let d = ""; req.on("data", (c) => { d += c; if (d.length > 16384) d = d.slice(0, 16384); });
    req.on("end", () => resolve(d)); req.on("error", () => resolve(""));
  });
}
function clean(s, max) { let o = ""; for (const ch of String(s)) if (ch.codePointAt(0) >= 32) o += ch; return o.slice(0, max); }
async function cmd(args) {
  const r = await fetch(KV_URL, { method: "POST", headers: { Authorization: "Bearer " + KV_TOKEN, "Content-Type": "application/json" }, body: JSON.stringify(args) });
  const j = await r.json(); return j.result;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!PANEL_KEY && !LOJA_KEY) { res.status(503).json({ error: "Defina LOJA_KEY (ou PANEL_KEY) no projeto." }); return; }
  if (!authed(req)) { res.status(401).json({ error: "Senha incorreta." }); return; }
  if (!KV_URL || !KV_TOKEN) { res.status(503).json({ error: "Banco (Redis/KV) não configurado." }); return; }

  // status efetivo (hash sobrescreve o original)
  async function statusMap() {
    const out = {};
    try { const flat = (await cmd(["HGETALL", "prevendas:status"])) || []; for (let i = 0; i < flat.length; i += 2) out[flat[i]] = flat[i + 1]; } catch { /* */ }
    return out;
  }

  // POST: atendente marca como retirado (sai da lista de pagos)
  if (req.method === "POST") {
    let body = await readRaw(req);
    if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
    if (!body || typeof body !== "object") body = {};
    const code = clean(body.code || "", 120);
    if (!code) { res.status(400).json({ error: "code" }); return; }
    const novo = body.action === "retirado" ? "retirado" : clean(body.status || "retirado", 120);
    try { await cmd(["HSET", "prevendas:status", code, novo]); res.status(200).json({ ok: true }); }
    catch (e) { res.status(500).json({ error: String((e && e.message) || e) }); }
    return;
  }

  // GET: lista só os pagos
  if (req.method === "GET") {
    try {
      const raw = (await cmd(["LRANGE", "prevendas", 0, 499])) || [];
      const st = await statusMap();
      const pagos = raw.map((x) => { try { return JSON.parse(x); } catch { return null; } }).filter(Boolean)
        .map((p) => { if (p.code && st[p.code]) p.status = st[p.code]; return p; })
        .filter((p) => p.status === "pago")
        .map((p) => ({ code: p.code, nome: p.nome, phone: p.phone, sabor: p.sabor, qty: p.qty, unidade: p.unidade, ts: p.ts }));
      res.status(200).json({ ok: true, updatedAt: Date.now(), pagos });
    } catch (e) { res.status(500).json({ error: String((e && e.message) || e) }); }
    return;
  }

  res.status(405).end();
}
