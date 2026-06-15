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
    req.on("data", (c) => { d += c; if (d.length > 16384) d = d.slice(0, 16384); });
    req.on("end", () => resolve(d));
    req.on("error", () => resolve(""));
  });
}
function clean(s, max){ let o=""; for(const ch of String(s)) if(ch.codePointAt(0)>=32) o+=ch; return o.slice(0, max); }
function semControle(s){ return clean(s, 120); }

async function pipeline(cmds) {
  const r = await fetch(KV_URL + "/pipeline", {
    method: "POST",
    headers: { Authorization: "Bearer " + KV_TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify(cmds),
  });
  if (!r.ok) throw new Error("kv " + r.status);
  return r.json();
}

// Só aceita chamadas vindas do nosso site.
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
  if (req.method !== "POST") { res.status(405).end(); return; }
  if (!KV_URL || !KV_TOKEN) { res.status(204).end(); return; }
  if (!originOk(req)) { res.status(204).end(); return; }
  if (!(await rateOk(ipOf(req), "lead", 8))) { res.status(204).end(); return; }
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
      data: semControle(body.data || ""),
      local: semControle(body.local || ""),
      convidados: Number(body.convidados) || 0,
      tipo: semControle(body.tipo || ""),
      total: Number(body.total) || 0,
      km: body.km == null ? null : Number(body.km),
      loja: semControle(body.loja || ""),
      // Orçamento completo (para abrir/imprimir o PDF no painel) + detalhes do evento
      doc: semControle(body.doc || ""),
      empresa: semControle(body.empresa || ""),
      obs: clean(body.obs || "", 500),
      sabores: Number(body.sabores) || 0,
      rend: semControle(body.rend || ""),
      promotoras: Number(body.promotoras) || 0,
      base: Number(body.base) || 0,
      logistica: body.logistica == null ? null : Number(body.logistica),
      potinhos: Number(body.potinhos) || 0,
      carrinho: Number(body.carrinho) || 0,
      pers: Array.isArray(body.pers) ? body.pers.slice(0, 8).map((x) => semControle(x)) : [],
      link: clean(body.link || "", 6000),
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
