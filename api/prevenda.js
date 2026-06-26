// Pré-venda BentôBytes: pedidos para retirada (Redis via REST) + notificação Telegram.
// POST: público, aceito também do subdomínio eventos.bentogelateria.com (CORS liberado p/ *.bentogelateria.com).
// GET: protegido por PANEL_KEY — lista os pedidos para o painel.
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

function corsOrigin(req) {
  const o = req.headers.origin || "";
  try { const h = new URL(o).hostname; if (h === "bentogelateria.com" || h.endsWith(".bentogelateria.com") || h.endsWith(".vercel.app")) return o; }
  catch { /* sem origin */ }
  return "";
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
  const origin = corsOrigin(req);
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  }
  if (req.method === "OPTIONS") { res.status(204).end(); return; }

  // Contador público de escassez: vendidos (base 200 + unidades pedidas no site) de 300.
  if (req.method === "GET" && req.query && req.query.count !== undefined) {
    res.setHeader("Cache-Control", "no-store");
    const BASE = 200, TOTAL = 300;
    try {
      const u = Number((KV_URL && KV_TOKEN) ? (await cmd(["GET", "prevendas:units"]) || 0) : 0);
      const sold = Math.min(TOTAL, BASE + Math.max(0, u));
      res.status(200).json({ ok: true, sold, total: TOTAL, baseline: BASE, remaining: Math.max(0, TOTAL - sold) });
    } catch {
      res.status(200).json({ ok: true, sold: BASE, total: TOTAL, baseline: BASE, remaining: TOTAL - BASE });
    }
    return;
  }

  // GET: painel privado lista os pedidos
  if (req.method === "GET") {
    res.setHeader("Cache-Control", "no-store");
    if (!PANEL_KEY) { res.status(503).json({ error: "PANEL_KEY não configurada no projeto." }); return; }
    if (!safeEq(getKey(req), PANEL_KEY)) { res.status(401).json({ error: "Senha incorreta." }); return; }
    if (!KV_URL || !KV_TOKEN) { res.status(503).json({ error: "Banco (Redis/KV) não configurado." }); return; }
    try {
      const raw = (await cmd(["LRANGE", "prevendas", 0, 499])) || [];
      const pedidos = raw.map((x) => { try { return JSON.parse(x); } catch { return null; } }).filter(Boolean);
      const total = Number(await cmd(["GET", "prevendas:count"]) || pedidos.length);
      res.status(200).json({ ok: true, updatedAt: Date.now(), total, pedidos });
    } catch (e) {
      res.status(500).json({ error: String((e && e.message) || e) });
    }
    return;
  }

  if (req.method !== "POST") { res.status(405).end(); return; }
  if (!KV_URL || !KV_TOKEN) { res.status(204).end(); return; }
  if (!(await rateOk(ipOf(req), "prevenda", 12))) { res.status(204).end(); return; }
  try {
    let body = await readRaw(req);
    if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
    if (!body || typeof body !== "object") body = {};

    const phoneDigits = String(body.phone || "").replace(/\D/g, "");
    if (phoneDigits.length < 10) { res.status(204).end(); return; }

    const qty = Math.max(1, Math.min(3, Number(body.qty) || 1)); // limite de 3 por pessoa (pré-venda)
    const ped = {
      ts: Date.now(),
      code: s120(body.code || ""),
      nome: s120(body.nome || ""),
      phone: s120(body.phone || ""),
      sabor: s120(body.sabor || ""),
      qty,
      unidade: s120(body.unidade || ""),
      total: Number(body.total) || 0,
      status: s120(body.status || "aguardando pagamento"),
    };
    await pipeline([
      ["LPUSH", "prevendas", JSON.stringify(ped)],
      ["LTRIM", "prevendas", 0, 999],
      ["INCR", "prevendas:count"],
      ["INCRBY", "prevendas:units", qty],
    ]);
    try {
      const dig = String(ped.phone).replace(/\D/g, "");
      const wa = "https://wa.me/" + (dig.length <= 11 ? "55" : "") + dig;
      const brl = (n) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
      const msg = [
        `🍫 <b>Nova pré-venda BentôBytes</b>`,
        ped.code ? `🧾 Pedido <b>${esc(ped.code)}</b>` : "",
        `👤 ${esc(ped.nome || "—")} · ${esc(ped.phone)}`,
        `🍨 ${esc(ped.sabor || "—")} × ${ped.qty}`,
        `📍 Retirada: ${esc(ped.unidade || "—")}`,
        `💰 ${brl(ped.total)} · ${esc(ped.status)}`,
        `📲 <a href="${wa}">Falar / receber comprovante</a>`,
      ].filter(Boolean).join("\n");
      await sendTelegram(msg);
    } catch {}
    res.status(204).end();
  } catch {
    res.status(204).end();
  }
}
