// Destaque da home — qual banner abre o site (1º card). Controlado pelo painel
// admin (Visão geral → ⭐ Destaque da home) e lido pela SPA em cada visita.
// GET: público, com cache curto de borda. POST: PANEL_KEY, {destaque:"<id>"}.
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
const KEY = "home:destaque";
// mesma lista de ORDEM_PADRAO em src/App.jsx — manter em sincronia ao criar banner novo
export const BANNERS_VALIDOS = ["eventos", "bytes", "tabelas", "cardapio", "delivery", "parceiro", "conheca", "carreira"];
const PADRAO = "eventos";

async function kv(args) {
  const r = await fetch(KV_URL, {
    method: "POST",
    headers: { Authorization: "Bearer " + KV_TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  return (await r.json().catch(() => ({}))).result;
}
function authed(req) {
  const h = req.headers.authorization || "";
  const k = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (!k || !PANEL_KEY) return false;
  const a = Buffer.from(String(k)), b = Buffer.from(String(PANEL_KEY));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    // cache de borda curto: o site inteiro lê daqui a cada visita
    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    let destaque = PADRAO;
    try {
      const v = KV_URL && KV_TOKEN ? await kv(["GET", KEY]) : null;
      if (v && BANNERS_VALIDOS.includes(v)) destaque = v;
    } catch { /* padrão */ }
    res.status(200).json({ destaque });
    return;
  }
  if (req.method !== "POST") { res.status(405).end(); return; }
  res.setHeader("Cache-Control", "no-store");
  if (!authed(req)) { res.status(401).json({ ok: false, error: "Senha incorreta." }); return; }
  if (!KV_URL || !KV_TOKEN) { res.status(503).json({ ok: false, error: "Banco (Redis/KV) não configurado." }); return; }
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  const d = body && body.destaque;
  if (!BANNERS_VALIDOS.includes(d)) { res.status(400).json({ ok: false, error: "Banner inválido." }); return; }
  await kv(["SET", KEY, d]);
  res.status(200).json({ ok: true, destaque: d });
}
