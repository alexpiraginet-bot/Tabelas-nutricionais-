// Relatório diário dos cliques do site, enviado por Telegram.
// Disparado pelo Cron da Vercel (Authorization: Bearer CRON_SECRET) ou manual (?key=PANEL_KEY).
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
const CRON_SECRET = process.env.CRON_SECRET;

async function cmd(args) {
  const r = await fetch(KV_URL, { method: "POST", headers: { Authorization: "Bearer " + KV_TOKEN, "Content-Type": "application/json" }, body: JSON.stringify(args) });
  return (await r.json()).result;
}
async function pipeline(cmds) {
  if (!cmds.length) return [];
  const r = await fetch(KV_URL + "/pipeline", { method: "POST", headers: { Authorization: "Bearer " + KV_TOKEN, "Content-Type": "application/json" }, body: JSON.stringify(cmds) });
  return (await r.json()).map((x) => x.result);
}
function safeEq(a, b) {
  const ab = Buffer.from(String(a)), bb = Buffer.from(String(b));
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}
function bearer(req) { const h = req.headers.authorization || ""; return h.startsWith("Bearer ") ? h.slice(7) : ""; }
function diaSP(ms) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(ms == null ? new Date() : new Date(ms));
}
const isConv = (n) => /^(Conversão|Sabor)\b/.test(n);

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const okCron = !!(CRON_SECRET && safeEq(bearer(req), CRON_SECRET));
  const okKey = !!(PANEL_KEY && safeEq((req.query && req.query.key) || "", PANEL_KEY));
  if (!okCron && !okKey) { res.status(401).json({ error: "não autorizado" }); return; }
  if (!KV_URL || !KV_TOKEN) { res.status(503).json({ error: "Banco (Redis/KV) não configurado." }); return; }
  try {
    const today = diaSP();
    const names = (await cmd(["SMEMBERS", "ev:names"])) || [];
    const hojeArr = await pipeline(names.map((n) => ["GET", "ev:d:" + today + ":" + n]));
    const totArr = await pipeline(names.map((n) => ["GET", "ev:t:" + n]));
    const rows = names.map((n, i) => ({ n, hoje: Number(hojeArr[i] || 0), tot: Number(totArr[i] || 0) }));
    const cliquesHoje = rows.reduce((s, r) => s + r.hoje, 0);
    const convHoje = rows.filter((r) => isConv(r.n)).reduce((s, r) => s + r.hoje, 0);
    const totalAcum = rows.reduce((s, r) => s + r.tot, 0);
    const top = rows.filter((r) => r.hoje > 0).sort((a, b) => b.hoje - a.hoje).slice(0, 6);

    let leadsHoje = 0;
    try {
      const raw = (await cmd(["LRANGE", "leads", 0, 199])) || [];
      for (const s of raw) { try { const l = JSON.parse(s); if (l && diaSP(l.ts) === today) leadsHoje++; } catch {} }
    } catch {}

    const dataBR = today.split("-").reverse().join("/");
    const msg = [
      `📊 <b>Relatório diário — Bentô</b> · ${dataBR}`,
      ``,
      `👆 Cliques hoje: <b>${cliquesHoje}</b>`,
      `⭐ Conversões hoje: <b>${convHoje}</b>`,
      `🎉 Orçamentos de evento hoje: <b>${leadsHoje}</b>`,
      ``,
      top.length ? `🏆 <b>Mais clicados hoje</b>:` : `Ainda sem cliques hoje.`,
      ...top.map((r, i) => `${i + 1}. ${esc(r.n)} — ${r.hoje}`),
      ``,
      `Σ Total acumulado: ${totalAcum.toLocaleString("pt-BR")} cliques`,
      `🔒 Painel: bentogelateria.com/painel.html`,
    ].join("\n");

    const sent = await sendTelegram(msg);
    res.status(200).json({ ok: true, sent, today, cliquesHoje, convHoje, leadsHoje });
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e) });
  }
}
