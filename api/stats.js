// Lê os contadores do Redis e devolve um resumo para o painel privado.
// Protegido por senha (PANEL_KEY). Envie a senha no header Authorization: Bearer <senha>.
import crypto from "node:crypto";

// Lê a senha do header Authorization (preferido) ou do ?key= (compatibilidade).
function getKey(req) {
  const h = req.headers.authorization || "";
  if (h.startsWith("Bearer ")) return h.slice(7);
  return (req.query && req.query.key ? req.query.key : "").toString();
}
// Comparação em tempo constante (evita timing attack).
function safeEq(a, b) {
  const ab = Buffer.from(String(a)), bb = Buffer.from(String(b));
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

// Detecta a REST API do Redis automaticamente, qualquer que seja o prefixo escolhido
// no painel da Vercel (KV_, UPSTASH_REDIS_, STORAGE_, etc.).
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
  if (!safeEq(getKey(req), PANEL_KEY)) { res.status(401).json({ error: "Senha incorreta." }); return; }
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
