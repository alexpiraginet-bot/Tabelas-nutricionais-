// Cadastro de candidatos às vagas de emprego (Redis via REST) + notificação Telegram.
// POST: público (vindo do site), nunca quebra a experiência (erros respondem 204).
// GET: protegido por PANEL_KEY (Authorization: Bearer <senha>) — lista os candidatos para o painel.
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
function safeEq(a, b) {
  const ab = Buffer.from(String(a)), bb = Buffer.from(String(b));
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

function readRaw(req) {
  if (req.body !== undefined && req.body !== null) return Promise.resolve(req.body);
  return new Promise((resolve) => {
    let d = "";
    req.on("data", (c) => { d += c; if (d.length > 16384) d = d.slice(0, 16384); });
    req.on("end", () => resolve(d));
    req.on("error", () => resolve(""));
  });
}
function clean(s, max) { let o = ""; for (const ch of String(s)) if (ch.codePointAt(0) >= 32) o += ch; return o.slice(0, max); }
const s120 = (s) => clean(s, 120);

async function pipeline(cmds) {
  const r = await fetch(KV_URL + "/pipeline", {
    method: "POST",
    headers: { Authorization: "Bearer " + KV_TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify(cmds),
  });
  if (!r.ok) throw new Error("kv " + r.status);
  return r.json();
}
async function cmd(args) {
  const r = await fetch(KV_URL, {
    method: "POST",
    headers: { Authorization: "Bearer " + KV_TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  const j = await r.json();
  return j.result;
}

function originOk(req) {
  const o = req.headers.origin || req.headers.referer || "";
  if (!o) return true;
  try { const h = new URL(o).hostname; return h === "bentogelateria.com" || h.endsWith(".bentogelateria.com") || h.endsWith(".vercel.app"); }
  catch { return true; }
}
function ipOf(req) { return String(req.headers["x-forwarded-for"] || "").split(",")[0].trim(); }
async function rateOk(ip, bucket, limit) {
  if (!ip) return true;
  try {
    const k = "rl:" + bucket + ":" + ip;
    const r = await pipeline([["INCR", k], ["EXPIRE", k, 60]]);
    const n = Array.isArray(r) ? (r[0] && (r[0].result ?? r[0])) : 0;
    return Number(n) <= limit;
  } catch { return true; }
}

export default async function handler(req, res) {
  // GET: painel privado lista os candidatos
  if (req.method === "GET") {
    res.setHeader("Cache-Control", "no-store");
    if (!PANEL_KEY) { res.status(503).json({ error: "PANEL_KEY não configurada no projeto." }); return; }
    if (!safeEq(getKey(req), PANEL_KEY)) { res.status(401).json({ error: "Senha incorreta." }); return; }
    if (!KV_URL || !KV_TOKEN) { res.status(503).json({ error: "Banco (Redis/KV) não configurado." }); return; }
    try {
      const raw = (await cmd(["LRANGE", "vagas", 0, 299])) || [];
      const candidatos = raw.map((x) => { try { return JSON.parse(x); } catch { return null; } }).filter(Boolean);
      const total = Number(await cmd(["GET", "vagas:count"]) || candidatos.length);
      res.status(200).json({ ok: true, updatedAt: Date.now(), total, candidatos });
    } catch (e) {
      res.status(500).json({ error: String((e && e.message) || e) });
    }
    return;
  }

  if (req.method !== "POST") { res.status(405).end(); return; }
  if (!KV_URL || !KV_TOKEN) { res.status(204).end(); return; }
  if (!originOk(req)) { res.status(204).end(); return; }
  if (!(await rateOk(ipOf(req), "vaga", 6))) { res.status(204).end(); return; }
  try {
    let body = await readRaw(req);
    if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
    if (!body || typeof body !== "object") body = {};

    const phoneDigits = String(body.phone || "").replace(/\D/g, "");
    if (phoneDigits.length < 10) { res.status(204).end(); return; } // sem telefone válido, ignora

    const cand = {
      ts: Date.now(),
      nome: s120(body.nome || ""),
      phone: s120(body.phone || ""),
      cargo: s120(body.cargo || "Atendente"),
      unidade: s120(body.unidade || ""),
      idade: s120(body.idade || ""),
      experiencia: clean(body.experiencia || "", 400),
      disponibilidade: s120(body.disponibilidade || ""),
      sobre: clean(body.sobre || "", 600),
      bairro: s120(body.bairro || ""),
    };
    await pipeline([
      ["LPUSH", "vagas", JSON.stringify(cand)],
      ["LTRIM", "vagas", 0, 499],
      ["INCR", "vagas:count"],
    ]);
    try {
      const dig = String(cand.phone).replace(/\D/g, "");
      const wa = "https://wa.me/" + (dig.length <= 11 ? "55" : "") + dig;
      const msg = [
        `💼 <b>Novo candidato — Vagas Bentô</b>`,
        `👤 ${esc(cand.nome || "—")} · ${esc(cand.phone)}`,
        `🪪 ${esc(cand.cargo)}${cand.unidade ? ` · ${esc(cand.unidade)}` : ""}`,
        cand.idade ? `🎂 ${esc(cand.idade)} anos` : "",
        cand.bairro ? `📍 ${esc(cand.bairro)}` : "",
        cand.disponibilidade ? `🗓️ ${esc(cand.disponibilidade)}` : "",
        cand.experiencia ? `🧰 ${esc(cand.experiencia)}` : "",
        cand.sobre ? `💬 ${esc(cand.sobre)}` : "",
        `📲 <a href="${wa}">Chamar no WhatsApp</a>`,
      ].filter(Boolean).join("\n");
      await sendTelegram(msg);
    } catch {}
    res.status(204).end();
  } catch {
    res.status(204).end();
  }
}
