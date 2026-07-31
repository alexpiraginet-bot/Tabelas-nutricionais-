// Entrega grátis — liga/desliga o selo de frete grátis do site. Controlado pelo
// painel admin (Visão geral → 🛵 Entrega grátis) e lido pela SPA a cada visita.
// Vale para qualquer dia: é a equipe que liga e desliga, sem regra de calendário.
// GET: público, com cache curto de borda. POST: PANEL_KEY, {ativo, texto?}.
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
const KEY = "home:entrega-gratis";
export const TEXTO_PADRAO = "Entrega grátis";
const TEXTO_MAX = 60;

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
// Sanitiza o texto que vai aparecer no site: sem controle, sem tag, curto.
const limpo = (s) => {
  let o = "";
  for (const ch of String(s || "")) if (ch.codePointAt(0) >= 32) o += ch;
  return o.replace(/[<>]/g, "").trim().slice(0, TEXTO_MAX);
};

export default async function handler(req, res) {
  if (req.method === "GET") {
    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    let estado = { ativo: false, texto: TEXTO_PADRAO };
    try {
      const v = KV_URL && KV_TOKEN ? await kv(["GET", KEY]) : null;
      const j = v ? JSON.parse(v) : null;
      if (j && j.ativo) estado = { ativo: true, texto: limpo(j.texto) || TEXTO_PADRAO };
    } catch { /* qualquer falha: não anuncia frete grátis */ }
    res.status(200).json(estado);
    return;
  }
  if (req.method !== "POST") { res.status(405).end(); return; }
  res.setHeader("Cache-Control", "no-store");
  if (!authed(req)) { res.status(401).json({ ok: false, error: "Senha incorreta." }); return; }
  if (!KV_URL || !KV_TOKEN) { res.status(503).json({ ok: false, error: "Banco (Redis/KV) não configurado." }); return; }
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  if (!body || typeof body !== "object") body = {};

  const estado = { ativo: body.ativo === true || body.ativo === "true", texto: limpo(body.texto) || TEXTO_PADRAO };
  const r = await kv(["SET", KEY, JSON.stringify(estado)]).catch(() => null);
  if (r !== "OK") { res.status(502).json({ ok: false, error: "Falha ao gravar no banco — tente novamente." }); return; }
  res.status(200).json({ ok: true, ...estado });
}
