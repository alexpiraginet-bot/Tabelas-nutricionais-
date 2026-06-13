// Captura de lead de orçamento de eventos no Redis (Upstash / Vercel KV) via REST.
// Recebe os dados do orçamento + WhatsApp e guarda numa lista para o painel.
// Endpoint público de escrita; nunca quebra a experiência (erros respondem 204).

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

function readRaw(req) {
  if (req.body !== undefined && req.body !== null) return Promise.resolve(req.body);
  return new Promise((resolve) => {
    let d = "";
    req.on("data", (c) => { d += c; if (d.length > 8192) d = d.slice(0, 8192); });
    req.on("end", () => resolve(d));
    req.on("error", () => resolve(""));
  });
}
function semControle(s){ let o=""; for(const ch of String(s)) if(ch.codePointAt(0)>=32) o+=ch; return o.slice(0,120); }

async function pipeline(cmds) {
  const r = await fetch(KV_URL + "/pipeline", {
    method: "POST",
    headers: { Authorization: "Bearer " + KV_TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify(cmds),
  });
  if (!r.ok) throw new Error("kv " + r.status);
  return r.json();
}

export default async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).end(); return; }
  if (!KV_URL || !KV_TOKEN) { res.status(204).end(); return; }
  try {
    let body = await readRaw(req);
    if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
    if (!body || typeof body !== "object") body = {};

    const phoneDigits = String(body.phone || "").replace(/\D/g, "");
    if (phoneDigits.length < 10) { res.status(204).end(); return; } // sem telefone válido, ignora

    const lead = {
      ts: Date.now(),
      stage: semControle(body.stage || "orçamento"),
      phone: semControle(body.phone || ""),
      nome: semControle(body.nome || ""),
      email: semControle(body.email || ""),
      doc: semControle(body.doc || ""),
      data: semControle(body.data || ""),
      local: semControle(body.local || ""),
      convidados: Number(body.convidados) || 0,
      tipo: semControle(body.tipo || ""),
      total: Number(body.total) || 0,
      km: body.km == null ? null : Number(body.km),
      loja: semControle(body.loja || ""),
    };
    await pipeline([
      ["LPUSH", "leads", JSON.stringify(lead)],
      ["LTRIM", "leads", 0, 999],
      ["INCR", "leads:count"],
    ]);
    res.status(204).end();
  } catch {
    res.status(204).end();
  }
}
