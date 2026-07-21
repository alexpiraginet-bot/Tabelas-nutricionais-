// Funil "Seja Bentô" (/seja-bento) — revenda, distribuição, franquia,
// internacional e parcerias estratégicas. POST público (nunca quebra a
// experiência: erros respondem 204) + notificação Telegram com a classificação.
// GET: protegido por PANEL_KEY — lista as oportunidades para o painel admin.
// Cada cadastro é classificado automaticamente: categoria (o caminho escolhido)
// e potencial (alto | medio | inicial) por pontuação simples e transparente.
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
    req.on("data", (c) => { d += c; if (d.length > 32768) d = d.slice(0, 32768); });
    req.on("end", () => resolve(d));
    req.on("error", () => resolve(""));
  });
}
function clean(s, max) { let o = ""; for (const ch of String(s)) if (ch.codePointAt(0) >= 32) o += ch; return o.slice(0, max); }
const s120 = (s) => clean(s, 120);
const arr = (v, max) => (Array.isArray(v) ? v.slice(0, 12).map((x) => s120(x)) : []).slice(0, max || 12);

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

const CATEGORIAS = ["revenda", "distribuicao", "franquia", "internacional", "parceria"];

// Potencial (alto | medio | inicial) — pontuação transparente por respostas.
// Regras da estratégia comercial: estrutura grande/volume alto/experiência
// internacional = alto; em implantação/candidato com capital = médio;
// "só pesquisando"/sem estrutura/sem capital = inicial.
function classifica(q, cat) {
  let pts = 0;
  const has = (field, ...alvos) => alvos.some((a) => String(q[field] || "").toLowerCase().includes(a));
  const inList = (field, ...alvos) => (q[field] || []).some((v) => alvos.some((a) => String(v).toLowerCase().includes(a)));
  if (cat === "revenda") {
    if (has("pontos", "6 a 20")) pts += 2; if (has("pontos", "mais de 20")) pts += 4;
    if (has("estagio", "funcionando")) pts += 2; if (has("estagio", "planejando")) pts -= 2;
    if (inList("estrutura", "câmara", "transporte")) pts += 2;
    if (inList("estrutura", "ainda não")) pts -= 2;
    if (has("pedido", "301", "acima de 1.000")) pts += 2;
    if (has("inicio", "imediatamente", "30 dias")) pts += 1;
    if (has("inicio", "avaliando")) pts -= 1;
  } else if (cat === "distribuicao") {
    if (has("clientesAtivos", "101", "mais de 500")) pts += 3; if (has("clientesAtivos", "51 a 100")) pts += 2;
    if (has("volume", "5.001", "20.001", "acima de 50.000")) pts += 3; if (has("volume", "1.001")) pts += 1;
    if (has("cobertura", "todo o estado", "mais de um estado", "nacional")) pts += 2;
    if (inList("estrutura", "frota refrigerada própria", "centro de distribuição")) pts += 2;
    if (inList("estrutura", "câmara", "equipe comercial")) pts += 1;
  } else if (cat === "franquia") {
    if (has("investimento", "300 mil", "acima de r$ 500")) pts += 3; if (has("investimento", "150 mil a")) pts += 2;
    if (inList("experiencia", "varejo", "alimentação", "gestão", "franquias")) pts += 2;
    if (has("ponto", "sim", "negociando")) pts += 1;
    if (has("prazo", "até 3 meses", "4 a 6")) pts += 1;
    if (has("prazo", "apenas pesquisando")) pts -= 3;
    if (inList("experiencia", "ainda não tenho")) pts -= 1;
  } else if (cat === "internacional") {
    if (inList("experiencia", "expansão", "franquias", "importação", "industrial", "refrigerada")) pts += 3;
    if (inList("estrutura", "empresa estabelecida", "centro de distribuição", "frota", "parceiro industrial")) pts += 2;
    if (has("capital", "us$ 500", "acima de us$ 1")) pts += 3; if (has("capital", "us$ 250 mil a")) pts += 2;
    if (has("capital", "será captado")) pts -= 2;
    if (has("unidades", "6 a 15", "16 a 30", "mais de 30")) pts += 2;
  } else if (cat === "parceria") {
    if (inList("oferece", "distribuição", "pontos de venda", "capital", "produção", "logística")) pts += 3;
    if (inList("oferece", "audiência", "divulgação", "tecnologia", "desenvolvimento")) pts += 1;
    if (clean(q.proposta || "", 500).length > 80) pts += 1;
  }
  return pts >= 5 ? "alto" : pts >= 2 ? "medio" : "inicial";
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    res.setHeader("Cache-Control", "no-store");
    if (!PANEL_KEY) { res.status(503).json({ error: "PANEL_KEY não configurada no projeto." }); return; }
    if (!safeEq(getKey(req), PANEL_KEY)) { res.status(401).json({ error: "Senha incorreta." }); return; }
    if (!KV_URL || !KV_TOKEN) { res.status(503).json({ error: "Banco (Redis/KV) não configurado." }); return; }
    try {
      const raw = (await cmd(["LRANGE", "sejabento", 0, 499])) || [];
      const leads = raw.map((x) => { try { return JSON.parse(x); } catch { return null; } }).filter(Boolean);
      const total = Number(await cmd(["GET", "sejabento:count"]) || leads.length);
      res.status(200).json({ ok: true, updatedAt: Date.now(), total, leads });
    } catch (e) {
      res.status(500).json({ error: String((e && e.message) || e) });
    }
    return;
  }

  if (req.method !== "POST") { res.status(405).end(); return; }
  if (!KV_URL || !KV_TOKEN) { res.status(204).end(); return; }
  if (!originOk(req)) { res.status(204).end(); return; }
  if (!(await rateOk(ipOf(req), "sejabento", 5))) { res.status(204).end(); return; }
  try {
    let body = await readRaw(req);
    if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
    if (!body || typeof body !== "object") body = {};
    if (body.site_url) { res.status(204).end(); return; } // honeypot: bots preenchem, humanos não veem

    const phoneDigits = String(body.whatsapp || "").replace(/\D/g, "");
    if (phoneDigits.length < 8) { res.status(204).end(); return; }
    const cat = CATEGORIAS.includes(body.categoria) ? body.categoria : "parceria";
    const q = (body.q && typeof body.q === "object") ? body.q : {};

    // respostas de qualificação: só strings/arrays curtos, campos conhecidos por caminho
    const qc = {};
    for (const k of ["oportunidade", "tipoEstab", "estagio", "pontos", "pedido", "inicio", "clientes", "clientesAtivos", "cobertura", "volume", "interesse", "exclusividade", "formato", "ponto", "participacao", "investimento", "prazo", "modelo", "capital", "unidades", "papel", "tipoParceria", "proposta", "estrutura", "experiencia", "oferece"]) {
      if (q[k] === undefined) continue;
      qc[k] = Array.isArray(q[k]) ? arr(q[k]) : clean(q[k], k === "proposta" ? 500 : 120);
    }

    const lead = {
      ts: Date.now(),
      categoria: cat,
      potencial: classifica(qc, cat),
      nome: s120(body.nome || ""),
      whatsapp: s120(body.whatsapp || ""),
      email: s120(body.email || ""),
      empresa: s120(body.empresa || ""),
      pais: s120(body.pais || ""),
      estado: s120(body.estado || ""),
      cidade: s120(body.cidade || ""),
      link: s120(body.link || ""),
      q: qc,
      contato: s120(body.contato || ""),
      origem: s120(body.origem || ""),
      obs: clean(body.obs || "", 600),
      utm: {
        source: s120((body.utm && body.utm.source) || ""),
        medium: s120((body.utm && body.utm.medium) || ""),
        campaign: s120((body.utm && body.utm.campaign) || ""),
      },
      url: clean(body.url || "", 300),
      ref: s120(body.ref || ""),
    };
    await pipeline([
      ["LPUSH", "sejabento", JSON.stringify(lead)],
      ["LTRIM", "sejabento", 0, 999],
      ["INCR", "sejabento:count"],
    ]);
    try {
      const wa = "https://wa.me/" + (phoneDigits.length <= 11 ? "55" : "") + phoneDigits;
      const CAT_LABEL = { revenda: "🏪 Revenda", distribuicao: "🚚 Distribuição", franquia: "🏬 Franquia", internacional: "🌎 Internacional", parceria: "🤝 Parceria" };
      const POT = { alto: "🔥 POTENCIAL ALTO — responder em 1 dia útil", medio: "⭐ potencial intermediário", inicial: "🌱 potencial inicial (nutrição)" };
      const resumo = Object.entries(lead.q).map(([k, v]) => `• ${k}: ${Array.isArray(v) ? v.join(", ") : v}`).join("\n");
      const msg = [
        `${CAT_LABEL[cat]} <b>— Nova oportunidade Seja Bentô</b>`,
        POT[lead.potencial],
        `👤 ${esc(lead.nome || "—")}${lead.empresa ? ` · ${esc(lead.empresa)}` : ""}`,
        `📍 ${esc([lead.cidade, lead.estado, lead.pais].filter(Boolean).join(" · ") || "—")}`,
        `✉️ ${esc(lead.email || "—")}`,
        lead.link ? `🔗 ${esc(lead.link)}` : "",
        resumo ? esc(resumo) : "",
        lead.obs ? `💬 ${esc(lead.obs)}` : "",
        lead.contato ? `⏰ Contato: ${esc(lead.contato)}` : "",
        lead.origem ? `📣 Conheceu por: ${esc(lead.origem)}` : "",
        lead.utm.source ? `🏷 UTM: ${esc([lead.utm.source, lead.utm.medium, lead.utm.campaign].filter(Boolean).join(" / "))}` : "",
        `📲 <a href="${wa}">Chamar no WhatsApp</a>`,
      ].filter(Boolean).join("\n");
      await sendTelegram(msg);
    } catch {}
    res.status(200).json({ ok: true });
  } catch {
    res.status(204).end();
  }
}
