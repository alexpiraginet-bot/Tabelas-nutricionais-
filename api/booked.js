// Datas reservadas (eventos com contrato emitido) — usado para o bloqueio suave no fechamento.
//   GET  ?d=YYYY-MM-DD                         -> { booked: bool }   (público; origin-check + rate-limit)
//   GET  (Authorization: Bearer PANEL_KEY)     -> { ok, dates: [...] }   (painel)
//   POST (Authorization: Bearer PANEL_KEY) { action:"add"|"remove", date } -> { ok, dates }
// Nunca quebra a experiência do cliente: em erro/sem config, responde booked:false.
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

async function cmd(args) {
  const r = await fetch(KV_URL, {
    method: "POST",
    headers: { Authorization: "Bearer " + KV_TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  const j = await r.json();
  return j.result;
}
async function pipeline(cmds) {
  const r = await fetch(KV_URL + "/pipeline", {
    method: "POST",
    headers: { Authorization: "Bearer " + KV_TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify(cmds),
  });
  return r.json();
}
function getKey(req) {
  const h = req.headers.authorization || "";
  if (h.startsWith("Bearer ")) return h.slice(7);
  return (req.query && req.query.key ? req.query.key : "").toString();
}
function safeEq(a, b) {
  const ab = Buffer.from(String(a)), bb = Buffer.from(String(b));
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}
function originOk(req) {
  const o = req.headers.origin || req.headers.referer || "";
  if (!o) return true;
  try { const h = new URL(o).hostname; return h === "bentogelateria.com" || h.endsWith(".bentogelateria.com") || h.endsWith(".vercel.app"); }
  catch { return true; }
}
function ipOf(req) { return String(req.headers["x-forwarded-for"] || "").split(",")[0].trim(); }
async function rateOk(ip, limit) {
  if (!ip) return true;
  try {
    const k = "rl:booked:" + ip;
    const r = await pipeline([["INCR", k], ["EXPIRE", k, 60]]);
    const n = Array.isArray(r) ? (r[0] && (r[0].result ?? r[0])) : 0;
    return Number(n) <= limit;
  } catch { return true; }
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
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s);

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!KV_URL || !KV_TOKEN) { res.status(200).json({ booked: false, dates: [] }); return; }
  const authed = !!(PANEL_KEY && safeEq(getKey(req), PANEL_KEY));

  try {
    if (req.method === "GET") {
      const d = (req.query && req.query.d ? req.query.d : "").toString();
      if (d) {
        // checagem pública de uma data
        if (!originOk(req)) { res.status(200).json({ booked: false }); return; }
        if (!(await rateOk(ipOf(req), 40))) { res.status(200).json({ booked: false }); return; }
        const m = isDate(d) ? await cmd(["SISMEMBER", "booked:dates", d]) : 0;
        res.status(200).json({ booked: Number(m) === 1 });
        return;
      }
      // listagem para o painel
      if (!authed) { res.status(401).json({ error: "Senha incorreta." }); return; }
      const dates = (await cmd(["SMEMBERS", "booked:dates"])) || [];
      res.status(200).json({ ok: true, dates: dates.filter(isDate).sort() });
      return;
    }

    if (req.method === "POST") {
      if (!authed) { res.status(401).json({ error: "Senha incorreta." }); return; }
      let body = await readRaw(req);
      if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
      const date = String((body && body.date) || "").trim();
      if (!isDate(date)) { res.status(400).json({ error: "Data inválida." }); return; }
      if (body.action === "remove") await cmd(["SREM", "booked:dates", date]);
      else await cmd(["SADD", "booked:dates", date]);
      const dates = (await cmd(["SMEMBERS", "booked:dates"])) || [];
      res.status(200).json({ ok: true, dates: dates.filter(isDate).sort() });
      return;
    }

    res.status(405).end();
  } catch (e) {
    // checagem pública nunca pode travar o fechamento
    if (req.method === "GET" && req.query && req.query.d) { res.status(200).json({ booked: false }); return; }
    res.status(500).json({ error: String((e && e.message) || e) });
  }
}
