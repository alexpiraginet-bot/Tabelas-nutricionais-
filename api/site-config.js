// Config editável do site — o que a equipe muda pelo painel sem tocar em código:
// horário das lojas, banners (ordem, ocultos, imagem), push da home e as
// opacidades da home (véu do filme, vidro dos cards, vinheta).
//
// DISCIPLINA: o CÓDIGO é o padrão; esta config só SOBRESCREVE. Campo ausente,
// config vazia ou banco fora do ar = site roda exatamente como está no código.
// Nunca é possível "apagar" o site editando aqui errado.
//
// FRONTEIRA: regra de negócio de ENTREGA (raio, centro, grátis, horário de
// entrega) NÃO mora aqui — é do totem, lida em /api/delivery/estado. Aqui é
// conteúdo e aparência do site, só.
//
// GET: público, cache curto de borda. POST: PANEL_KEY, documento inteiro.
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
const KEY = "site:config";

// Mesma lista de ORDEM_PADRAO em src/App.jsx e de BANNERS_VALIDOS em
// api/destaque.js — manter em sincronia ao criar banner novo.
const BANNERS = ["eventos", "studio", "bytes", "tabelas", "cardapio", "parceiro", "conheca", "carreira", "creators"];
const PUSH_TIPOS = ["nenhum", "entrega", "lancamento"];

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

// ---------- saneamento: nada entra sem passar por aqui ----------
const texto = (s, max) => {
  let o = "";
  for (const ch of String(s ?? "")) if (ch.codePointAt(0) >= 32) o += ch;
  return o.replace(/[<>]/g, "").trim().slice(0, max);
};
// Aceita http(s) absoluto (Supabase Storage) ou caminho do próprio site
// ("/banners/x.webp"). Bloqueia javascript:, data:, vbscript: e afins vindos
// do painel — o valor vai parar num href/src, então esquema errado seria XSS.
// "//host" é recusado de propósito: parece caminho mas é URL externa.
const url = (u) => {
  const s = texto(u, 400);
  if (!s) return "";
  if (s.startsWith("/") && !s.startsWith("//")) return s;
  try { const x = new URL(s); return (x.protocol === "https:" || x.protocol === "http:") ? s : ""; }
  catch { return ""; }
};
const num = (v, min, max) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : null;
};
// Horário de uma loja: {0:[abre,fecha]|null, …6} + resumo [[rótulo,texto],…]
function limpaLoja(v) {
  const out = {};
  if (v && typeof v === "object") {
    if (v.dias && typeof v.dias === "object") {
      const dias = {};
      for (let d = 0; d <= 6; d++) {
        const par = v.dias[d];
        if (par === null) { dias[d] = null; continue; }
        if (!Array.isArray(par) || par.length !== 2) continue;
        const a = num(par[0], 0, 24), f = num(par[1], 0, 24);
        if (a === null || f === null || f <= a) continue;
        dias[d] = [a, f];
      }
      // Semana INTEIRA fechada nunca é configuração de verdade — é o formulário
      // do painel salvo em branco (vazio = fechado). Já derrubou as duas lojas
      // do site por um dia. Descartar aqui faz o site voltar ao horário do
      // código, e como a leitura também passa por limpaConfig, uma config já
      // gravada assim se cura sozinha na primeira resposta do GET.
      const algumDiaAberto = Object.values(dias).some((p) => Array.isArray(p));
      if (Object.keys(dias).length && algumDiaAberto) out.dias = dias;
    }
    if (Array.isArray(v.resumo)) {
      const r = v.resumo
        .filter((x) => Array.isArray(x) && x.length === 2)
        .map((x) => [texto(x[0], 24), texto(x[1], 24)])
        .filter((x) => x[0] && x[1])
        .slice(0, 8);
      if (r.length) out.resumo = r;
    }
  }
  return Object.keys(out).length ? out : null;
}

function limpaConfig(body) {
  const c = {};
  const b = body && typeof body === "object" ? body : {};

  // --- lojas: horários ---
  if (b.lojas && typeof b.lojas === "object") {
    const lojas = {};
    for (const [id, v] of Object.entries(b.lojas)) {
      const key = texto(id, 40);
      const l = limpaLoja(v);
      if (key && l) lojas[key] = l;
    }
    if (Object.keys(lojas).length) c.lojas = lojas;
  }

  // --- banners: ordem, ocultos, imagem ---
  if (b.banners && typeof b.banners === "object") {
    const bn = {};
    if (Array.isArray(b.banners.ordem)) {
      const vistos = new Set();
      const ordem = b.banners.ordem.filter((x) => BANNERS.includes(x) && !vistos.has(x) && vistos.add(x));
      // completa com os que ficaram de fora, para nunca sumir um card por engano
      for (const x of BANNERS) if (!vistos.has(x)) ordem.push(x);
      if (ordem.length) bn.ordem = ordem;
    }
    if (Array.isArray(b.banners.ocultos)) {
      const oc = [...new Set(b.banners.ocultos.filter((x) => BANNERS.includes(x)))];
      // trava de segurança: não dá para ocultar TODOS e deixar a home vazia
      bn.ocultos = oc.length >= BANNERS.length ? oc.slice(0, BANNERS.length - 1) : oc;
    }
    if (b.banners.imagens && typeof b.banners.imagens === "object") {
      const im = {};
      for (const [id, u] of Object.entries(b.banners.imagens)) {
        const v = url(u);
        if (BANNERS.includes(id) && v) im[id] = v;
      }
      if (Object.keys(im).length) bn.imagens = im;
    }
    if (Object.keys(bn).length) c.banners = bn;
  }

  // --- push da home ---
  if (b.push && typeof b.push === "object") {
    const tipo = PUSH_TIPOS.includes(b.push.tipo) ? b.push.tipo : "nenhum";
    const p = { tipo };
    if (tipo !== "nenhum") {
      p.titulo = texto(b.push.titulo, 60);
      p.linha = texto(b.push.linha, 140);
      p.etiqueta = texto(b.push.etiqueta, 30);
      p.botao = texto(b.push.botao, 30);
      p.href = url(b.push.href);
      p.imagem = url(b.push.imagem);
    }
    c.push = p;
  }

  // --- opacidades da home ---
  if (b.visual && typeof b.visual === "object") {
    const v = {};
    const veu = num(b.visual.veu, 0, 1);
    const vidro = num(b.visual.vidro, 0, 1);
    const vinheta = num(b.visual.vinheta, 0, 1);
    if (veu !== null) v.veu = veu;
    if (vidro !== null) v.vidro = vidro;
    if (vinheta !== null) v.vinheta = vinheta;
    if (Object.keys(v).length) c.visual = v;
  }
  return c;
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    let cfg = {};
    try {
      const v = KV_URL && KV_TOKEN ? await kv(["GET", KEY]) : null;
      const j = v ? JSON.parse(v) : null;
      if (j && typeof j === "object") cfg = limpaConfig(j); // sanea também na leitura
    } catch { /* qualquer falha: config vazia = site roda no padrão do código */ }
    res.status(200).json(cfg);
    return;
  }
  if (req.method !== "POST") { res.status(405).end(); return; }
  res.setHeader("Cache-Control", "no-store");
  if (!authed(req)) { res.status(401).json({ ok: false, error: "Senha incorreta." }); return; }
  if (!KV_URL || !KV_TOKEN) { res.status(503).json({ ok: false, error: "Banco (Redis/KV) não configurado." }); return; }
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  const cfg = limpaConfig(body);
  const r = await kv(["SET", KEY, JSON.stringify(cfg)]).catch(() => null);
  if (r !== "OK") { res.status(502).json({ ok: false, error: "Falha ao gravar no banco — tente novamente." }); return; }
  res.status(200).json({ ok: true, config: cfg });
}
