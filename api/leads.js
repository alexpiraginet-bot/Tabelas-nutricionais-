// Lista os leads de orçamento para o painel privado. Protegido por senha (PANEL_KEY).
// GET /api/leads?key=SENHA

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

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!PANEL_KEY) { res.status(503).json({ error: "PANEL_KEY não configurada no projeto." }); return; }
  const key = (req.query && req.query.key ? req.query.key : "").toString();
  if (key !== PANEL_KEY) { res.status(401).json({ error: "Senha incorreta." }); return; }
  if (!KV_URL || !KV_TOKEN) { res.status(503).json({ error: "Banco (Redis/KV) não configurado." }); return; }
  try {
    const raw = (await cmd(["LRANGE", "leads", 0, 299])) || [];
    const leads = raw.map((s) => { try { return JSON.parse(s); } catch { return null; } }).filter(Boolean);
    const total = Number(await cmd(["GET", "leads:count"]) || leads.length);
    res.status(200).json({ ok: true, updatedAt: Date.now(), total, leads });
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e) });
  }
}
