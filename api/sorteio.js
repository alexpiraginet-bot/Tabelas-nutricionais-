// Sorteio BentôBytes (10 kits): inscrições no Redis + sorteio dos ganhadores.
// POST público (site/subdomínio): grava 1 inscrição por telefone (sem duplicar).
// POST autenticado {action:"draw"}: sorteia N ganhadores e guarda.
// GET autenticado: lista inscrições + ganhadores para o painel.
import crypto from "node:crypto";
import { sendTelegram, esc } from "../lib/telegram.js";

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

function getKey(req) {
  const h = req.headers.authorization || "";
  if (h.startsWith("Bearer ")) return h.slice(7);
  return (req.query && req.query.key ? req.query.key : "").toString();
}
function authed(req) {
  if (!PANEL_KEY) return false;
  const a = Buffer.from(String(getKey(req))), b = Buffer.from(String(PANEL_KEY));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function readRaw(req) {
  if (req.body !== undefined && req.body !== null) return Promise.resolve(req.body);
  return new Promise((resolve) => {
    let d = ""; req.on("data", (c) => { d += c; if (d.length > 16384) d = d.slice(0, 16384); });
    req.on("end", () => resolve(d)); req.on("error", () => resolve(""));
  });
}
function clean(s, max) { let o = ""; for (const ch of String(s)) if (ch.codePointAt(0) >= 32) o += ch; return o.slice(0, max); }
const s120 = (s) => clean(s, 120);

async function pipeline(cmds) {
  const r = await fetch(KV_URL + "/pipeline", { method: "POST", headers: { Authorization: "Bearer " + KV_TOKEN, "Content-Type": "application/json" }, body: JSON.stringify(cmds) });
  if (!r.ok) throw new Error("kv " + r.status);
  return r.json();
}
async function cmd(args) {
  const r = await fetch(KV_URL, { method: "POST", headers: { Authorization: "Bearer " + KV_TOKEN, "Content-Type": "application/json" }, body: JSON.stringify(args) });
  const j = await r.json(); return j.result;
}
function corsOrigin(req) {
  const o = req.headers.origin || "";
  try { const h = new URL(o).hostname; if (h === "bentogelateria.com" || h.endsWith(".bentogelateria.com") || h.endsWith(".vercel.app")) return o; } catch { /* */ }
  return "";
}
function ipOf(req) { return String(req.headers["x-forwarded-for"] || "").split(",")[0].trim(); }
async function rateOk(ip, bucket, limit) {
  if (!ip) return true;
  try { const k = "rl:" + bucket + ":" + ip; const r = await pipeline([["INCR", k], ["EXPIRE", k, 60]]); const n = Array.isArray(r) ? (r[0] && (r[0].result ?? r[0])) : 0; return Number(n) <= limit; } catch { return true; }
}

export default async function handler(req, res) {
  const origin = corsOrigin(req);
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  }
  if (req.method === "OPTIONS") { res.status(204).end(); return; }
  if (!KV_URL || !KV_TOKEN) {
    if (req.method === "GET") res.status(503).json({ error: "Banco (Redis/KV) não configurado." });
    else res.status(200).json({ ok: false, error: "kv" });
    return;
  }

  // GET: painel lista inscrições + ganhadores
  if (req.method === "GET") {
    res.setHeader("Cache-Control", "no-store");
    if (!authed(req)) { res.status(401).json({ error: "Senha incorreta." }); return; }
    try {
      const raw = (await cmd(["LRANGE", "sorteio", 0, 4999])) || [];
      const inscritos = raw.map((x) => { try { return JSON.parse(x); } catch { return null; } }).filter(Boolean);
      const total = Number(await cmd(["GET", "sorteio:count"]) || inscritos.length);
      let winners = []; let drawnAt = null;
      try { const w = await cmd(["GET", "sorteio:winners"]); if (w) { const p = JSON.parse(w); winners = p.winners || []; drawnAt = p.drawnAt || null; } } catch { /* */ }
      res.status(200).json({ ok: true, total, inscritos, winners, drawnAt });
    } catch (e) { res.status(500).json({ error: String((e && e.message) || e) }); }
    return;
  }

  if (req.method !== "POST") { res.status(405).end(); return; }
  let body = await readRaw(req);
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  if (!body || typeof body !== "object") body = {};

  // POST autenticado: sortear ganhadores
  if (body.action === "draw") {
    if (!authed(req)) { res.status(401).json({ error: "Senha incorreta." }); return; }
    const n = Math.max(1, Math.min(50, Number(body.n) || 10));
    try {
      const raw = (await cmd(["LRANGE", "sorteio", 0, 4999])) || [];
      const all = raw.map((x) => { try { return JSON.parse(x); } catch { return null; } }).filter(Boolean);
      // Fisher–Yates
      for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = all[i]; all[i] = all[j]; all[j] = t; }
      const winners = all.slice(0, n);
      const payload = { winners, drawnAt: Date.now(), n };
      await cmd(["SET", "sorteio:winners", JSON.stringify(payload)]);
      try {
        const lines = ["🎁 <b>Sorteio BentôBytes — ganhadores</b>", ...winners.map((w, i) => `${i + 1}. ${esc(w.nome || "—")} · ${esc(w.phone || "")}${w.instagram ? " · " + esc(w.instagram) : ""}`)];
        await sendTelegram(lines.join("\n"));
      } catch { /* */ }
      res.status(200).json({ ok: true, winners, drawnAt: payload.drawnAt });
    } catch (e) { res.status(500).json({ error: String((e && e.message) || e) }); }
    return;
  }

  // POST público: inscrição
  if (!(await rateOk(ipOf(req), "sorteio", 10))) { res.status(429).json({ error: "Calma! tente em instantes." }); return; }
  const phoneDigits = String(body.phone || "").replace(/\D/g, "");
  if (phoneDigits.length < 10) { res.status(200).json({ ok: false, error: "telefone" }); return; }
  try {
    const isNew = await cmd(["SADD", "sorteio:phones", phoneDigits]); // 1 se novo, 0 se já existia
    if (Number(isNew) === 1) {
      const reg = {
        ts: Date.now(),
        nome: s120(body.nome || ""),
        phone: s120(body.phone || ""),
        instagram: s120(body.instagram || ""),
        unidade: s120(body.unidade || ""),
        consent: body.consent === true || body.consent === "true" ? 1 : 0,
      };
      await pipeline([["LPUSH", "sorteio", JSON.stringify(reg)], ["LTRIM", "sorteio", 0, 4999], ["INCR", "sorteio:count"]]);
      res.status(200).json({ ok: true, dup: false });
    } else {
      res.status(200).json({ ok: true, dup: true });
    }
  } catch (e) { res.status(200).json({ ok: false, error: "kv" }); }
}
