// Lê os contadores do Redis e devolve um resumo para o painel privado.
// Protegido por senha (PANEL_KEY). GET /api/stats?key=SENHA

const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
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
  if (!cmds.length) return [];
  const r = await fetch(KV_URL + "/pipeline", {
    method: "POST",
    headers: { Authorization: "Bearer " + KV_TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify(cmds),
  });
  const j = await r.json();
  return j.map((x) => x.result);
}

// Últimos n dias (YYYY-MM-DD), ancorados na data de São Paulo.
function ultimosDias(n) {
  const hoje = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
  const [Y, M, D] = hoje.split("-").map(Number);
  const d = new Date(Date.UTC(Y, M - 1, D));
  const out = [];
  for (let i = 0; i < n; i++) { out.unshift(d.toISOString().slice(0, 10)); d.setUTCDate(d.getUTCDate() - 1); }
  return out;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!PANEL_KEY) { res.status(503).json({ error: "PANEL_KEY não configurada no projeto." }); return; }
  const key = (req.query && req.query.key ? req.query.key : "").toString();
  if (key !== PANEL_KEY) { res.status(401).json({ error: "Senha incorreta." }); return; }
  if (!KV_URL || !KV_TOKEN) { res.status(503).json({ error: "Banco (Redis/KV) não configurado." }); return; }

  try {
    const names = (await cmd(["SMEMBERS", "ev:names"])) || [];
    const days = ultimosDias(14);

    const totaisArr = await pipeline(names.map((n) => ["GET", "ev:t:" + n]));
    const totals = {};
    names.forEach((n, i) => { totals[n] = Number(totaisArr[i] || 0); });

    const series = {};
    if (names.length) {
      const cmds = [];
      for (const n of names) for (const dia of days) cmds.push(["GET", "ev:d:" + dia + ":" + n]);
      const arr = await pipeline(cmds);
      let k = 0;
      for (const n of names) {
        series[n] = [];
        for (let i = 0; i < days.length; i++) series[n].push(Number(arr[k++] || 0));
      }
    }

    res.status(200).json({ ok: true, updatedAt: Date.now(), days, totals, series });
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e) });
  }
}
