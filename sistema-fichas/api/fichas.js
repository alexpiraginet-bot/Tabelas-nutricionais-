// Rascunhos das fichas técnicas (painel /fichas.html — nutricionista & P&D).
// Os rascunhos NÃO alteram o site público: ficam no KV até serem aplicados em
// src/data.js por commit. Auth: Authorization: Bearer <FICHAS_KEY ou PANEL_KEY>.
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
const KEYS = [process.env.FICHAS_KEY, process.env.PANEL_KEY].filter(Boolean);
const KV_KEY = "fichas:drafts";
const KV_INSUMOS = "fichas:insumos";
const KV_RECEITAS = "fichas:receitas";

function bearer(req) {
  const h = req.headers.authorization || "";
  return h.startsWith("Bearer ") ? h.slice(7) : "";
}
function authed(req) {
  const k = bearer(req);
  if (!k) return false;
  return KEYS.some((s) => {
    const a = Buffer.from(String(k)), b = Buffer.from(String(s));
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  });
}
async function kv(cmd) {
  const r = await fetch(KV_URL, {
    method: "POST",
    headers: { Authorization: "Bearer " + KV_TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
  });
  const j = await r.json().catch(() => ({}));
  return j.result;
}
async function readMap(key) {
  const raw = await kv(["GET", key]);
  try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}
const readDrafts = () => readMap(KV_KEY);

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!KEYS.length) { res.status(503).json({ ok: false, error: "Configure FICHAS_KEY (ou PANEL_KEY) na Vercel." }); return; }
  if (!authed(req)) { res.status(401).json({ ok: false, error: "Senha incorreta." }); return; }
  if (!KV_URL || !KV_TOKEN) { res.status(503).json({ ok: false, error: "Banco (Redis/KV) não configurado." }); return; }

  if (req.method === "GET") {
    const [drafts, insumos, receitas] = await Promise.all([readDrafts(), readMap(KV_INSUMOS), readMap(KV_RECEITAS)]);
    res.status(200).json({ ok: true, drafts, insumos, receitas, ai: !!process.env.ANTHROPIC_API_KEY });
    return;
  }
  if (req.method !== "POST") { res.status(405).end(); return; }

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  if (!body || typeof body !== "object") body = {};

  // roteia a ação para o mapa certo: rascunhos de SKU, cadastro de insumos ou receitas
  const KEYMAP = { save: KV_KEY, clear: KV_KEY, "insumo-save": KV_INSUMOS, "insumo-del": KV_INSUMOS, "receita-save": KV_RECEITAS, "receita-del": KV_RECEITAS };
  const storeKey = KEYMAP[body.action];
  if (!storeKey || !body.id) { res.status(400).json({ ok: false, error: "action" }); return; }
  const map = await readMap(storeKey);
  if (/-(save)$|^save$/.test(body.action)) {
    if (!body.patch || typeof body.patch !== "object") { res.status(400).json({ ok: false, error: "patch" }); return; }
    map[body.id] = {
      ...(map[body.id] || {}),
      ...body.patch,
      _meta: { by: String(body.by || "").slice(0, 60), at: new Date().toISOString() },
    };
  } else {
    delete map[body.id];
  }
  await kv(["SET", storeKey, JSON.stringify(map)]);
  const out = { ok: true };
  out[storeKey === KV_KEY ? "drafts" : storeKey === KV_INSUMOS ? "insumos" : "receitas"] = map;
  res.status(200).json(out);
}
