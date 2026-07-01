// Clube Bentô: identidade por WhatsApp + progresso na nuvem (Redis via REST),
// resgate de recompensas com código único e programa indique-e-ganhe.
// POST público (sync/indicacao/resgate, com rate-limit) · validar exige PANEL_KEY ou LOJA_KEY.
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
const LOJA_KEY = process.env.LOJA_KEY;

async function cmd(args) {
  const r = await fetch(KV_URL, { method: "POST", headers: { Authorization: "Bearer " + KV_TOKEN, "Content-Type": "application/json" }, body: JSON.stringify(args) });
  const j = await r.json(); return j.result;
}
async function pipeline(cmds) {
  const r = await fetch(KV_URL + "/pipeline", { method: "POST", headers: { Authorization: "Bearer " + KV_TOKEN, "Content-Type": "application/json" }, body: JSON.stringify(cmds) });
  if (!r.ok) throw new Error("kv " + r.status);
  return r.json();
}
function getKey(req) {
  const h = req.headers.authorization || "";
  if (h.startsWith("Bearer ")) return h.slice(7);
  return (req.query && req.query.key ? req.query.key : "").toString();
}
function eq(a, b) {
  if (!a || !b) return false;
  const ab = Buffer.from(String(a)), bb = Buffer.from(String(b));
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}
const staffed = (req) => eq(getKey(req), PANEL_KEY) || eq(getKey(req), LOJA_KEY);
function readRaw(req) {
  if (req.body !== undefined && req.body !== null) return Promise.resolve(req.body);
  return new Promise((resolve) => {
    let d = ""; req.on("data", (c) => { d += c; if (d.length > 32768) d = d.slice(0, 32768); });
    req.on("end", () => resolve(d)); req.on("error", () => resolve(""));
  });
}
function clean(s, max) { let o = ""; for (const ch of String(s)) if (ch.codePointAt(0) >= 32) o += ch; return o.slice(0, max); }
function corsOrigin(req) {
  const o = req.headers.origin || "";
  try { const h = new URL(o).hostname; if (h === "bentogelateria.com" || h.endsWith(".bentogelateria.com") || h.endsWith(".vercel.app")) return o; }
  catch { /* */ }
  return "";
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

const strList = (a, maxLen, maxN) => Array.isArray(a) ? [...new Set(a.filter(x => typeof x === "string").map(x => clean(x, maxLen)))].slice(0, maxN) : [];
const numList = (a, maxN) => Array.isArray(a) ? [...new Set(a.map(Number).filter(n => Number.isInteger(n) && n >= 1 && n <= 20))].slice(0, maxN) : [];

// Recompensas resgatáveis e a elegibilidade verificada no estado sincronizado.
const REWARDS = {
  "quiz-baby": { label: "Bentôlé Baby de cortesia (quiz do sabor)", ok: (s) => !!(s.quiz && s.quiz.id) },
  "album": { label: "Comemoração do álbum completo", ok: (s) => (s.album || []).length >= 10 },
  "indicacao": { label: "Bentôlé de cortesia (3 amigos indicados)", ok: (s, ind) => ind >= 3 },
  "ouro": { label: "Boas-vindas Cliente Ouro (5 conquistas)", ok: (s) => (s.badges || []).length >= 5 },
};

async function loadState(phone) {
  let st = {};
  try { st = JSON.parse((await cmd(["GET", "clube:" + phone])) || "{}"); } catch { /* */ }
  if (!st || typeof st !== "object") st = {};
  return st;
}

export default async function handler(req, res) {
  const origin = corsOrigin(req);
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  }
  if (req.method === "OPTIONS") { res.status(204).end(); return; }
  res.setHeader("Cache-Control", "no-store");
  if (!KV_URL || !KV_TOKEN) { res.status(503).json({ ok: false, error: "Banco (Redis/KV) não configurado." }); return; }

  // GET (painel): lista os membros do Clube — protegido.
  if (req.method === "GET") {
    if (!staffed(req)) { res.status(401).json({ error: "Senha incorreta." }); return; }
    try {
      const phones = ((await cmd(["SMEMBERS", "clube:phones"])) || []).slice(0, 500);
      const out = [];
      for (const ph of phones) {
        const st = await loadState(ph);
        let ind = 0; try { ind = Number(await cmd(["SCARD", "clube:ind:" + ph])) || 0; } catch { /* */ }
        out.push({ phone: ph, badges: (st.badges || []).length, album: (st.album || []).length, quiz: st.quiz ? st.quiz.name : null, ind, updated: st.updated || null });
      }
      out.sort((a, b) => (b.updated || 0) - (a.updated || 0));
      res.status(200).json({ ok: true, total: out.length, membros: out });
    } catch (e) { res.status(500).json({ error: String((e && e.message) || e) }); }
    return;
  }

  if (req.method !== "POST") { res.status(405).end(); return; }
  let body = await readRaw(req);
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  if (!body || typeof body !== "object") body = {};

  // Validação de código pela equipe (loja) — marca como usado uma única vez.
  if (body.action === "validar") {
    if (!staffed(req)) { res.status(401).json({ error: "Senha incorreta." }); return; }
    const code = clean(body.code || "", 20).toUpperCase().trim();
    if (!code) { res.status(400).json({ error: "code" }); return; }
    try {
      const raw = await cmd(["GET", "clube:resgate:" + code]);
      if (!raw) { res.status(200).json({ ok: false, error: "Código não encontrado." }); return; }
      let r = {}; try { r = JSON.parse(raw); } catch { /* */ }
      if (r.used) { res.status(200).json({ ok: false, error: "Código já utilizado.", reward: REWARDS[r.reward]?.label, usedAt: r.usedAt }); return; }
      r.used = 1; r.usedAt = Date.now();
      await cmd(["SET", "clube:resgate:" + code, JSON.stringify(r)]);
      res.status(200).json({ ok: true, reward: REWARDS[r.reward]?.label || r.reward, phone: r.phone });
    } catch (e) { res.status(500).json({ error: String((e && e.message) || e) }); }
    return;
  }

  // Indicação: visitante indicado completou o quiz (dedupe por visitante).
  if (body.action === "indicacao") {
    if (!(await rateOk(ipOf(req), "clube-ind", 10))) { res.status(429).json({ ok: false }); return; }
    const ref = clean(body.ref || "", 12).toUpperCase().replace(/[^A-Z0-9]/g, "");
    const visitor = clean(body.visitor || "", 48);
    if (!ref || visitor.length < 8) { res.status(200).json({ ok: false }); return; }
    try {
      const phone = await cmd(["GET", "clube:ref:" + ref]);
      if (!phone) { res.status(200).json({ ok: false }); return; }
      await cmd(["SADD", "clube:ind:" + phone, visitor]);
      res.status(200).json({ ok: true });
    } catch { res.status(200).json({ ok: false }); }
    return;
  }

  const phone = String(body.phone || "").replace(/\D/g, "");
  if (phone.length < 10 || phone.length > 13) { res.status(200).json({ ok: false, error: "Informe um WhatsApp válido (com DDD)." }); return; }

  // Sincronização do progresso (merge: nunca perde nada de nenhum aparelho).
  if (body.action === "sync") {
    if (!(await rateOk(ipOf(req), "clube-sync", 20))) { res.status(429).json({ ok: false, error: "Calma! Tente em instantes." }); return; }
    if (!body.consent) { res.status(200).json({ ok: false, error: "consent" }); return; }
    try {
      const cur = await loadState(phone);
      const inc = (body.state && typeof body.state === "object") ? body.state : {};
      const st = {
        badges: [...new Set([...(cur.badges || []), ...strList(inc.badges, 24, 12)])],
        album: [...new Set([...(cur.album || []), ...numList(inc.album, 10)])],
        favs: [...new Set([...(cur.favs || []), ...strList(inc.favs, 40, 30)])].slice(0, 30),
        fichas: Math.max(Number(cur.fichas) || 0, Math.min(500, Number(inc.fichas) || 0)),
        quiz: (() => {
          const a = cur.quiz, b = inc.quiz && inc.quiz.id ? { id: clean(inc.quiz.id, 40), name: clean(inc.quiz.name || "", 60), ts: Number(inc.quiz.ts) || Date.now() } : null;
          if (a && b) return (b.ts >= (a.ts || 0)) ? b : a;
          return b || a || null;
        })(),
        ref: cur.ref || null,
        updated: Date.now(),
      };
      if (!st.ref) {
        for (let i = 0; i < 4 && !st.ref; i++) {
          const c = crypto.randomBytes(4).toString("base64").replace(/[^A-Za-z0-9]/g, "").slice(0, 6).toUpperCase();
          if (c.length < 6) continue;
          const okNew = await cmd(["SET", "clube:ref:" + c, phone, "NX"]);
          if (okNew === "OK") st.ref = c;
        }
      }
      await pipeline([["SET", "clube:" + phone, JSON.stringify(st)], ["SADD", "clube:phones", phone]]);
      let ind = 0; try { ind = Number(await cmd(["SCARD", "clube:ind:" + phone])) || 0; } catch { /* */ }
      let codes = {}; try { const flat = (await cmd(["HGETALL", "clube:cod:" + phone])) || []; for (let i = 0; i < flat.length; i += 2) codes[flat[i]] = flat[i + 1]; } catch { /* */ }
      res.status(200).json({ ok: true, state: { ...st, ind, codes } });
    } catch (e) { res.status(500).json({ ok: false, error: String((e && e.message) || e) }); }
    return;
  }

  // Resgate: gera código único de 1 uso para uma recompensa elegível (idempotente por recompensa).
  if (body.action === "resgate") {
    if (!(await rateOk(ipOf(req), "clube-resg", 10))) { res.status(429).json({ ok: false }); return; }
    const reward = clean(body.reward || "", 20);
    const def = REWARDS[reward];
    if (!def) { res.status(400).json({ ok: false, error: "reward" }); return; }
    try {
      const st = await loadState(phone);
      let ind = 0; try { ind = Number(await cmd(["SCARD", "clube:ind:" + phone])) || 0; } catch { /* */ }
      if (!def.ok(st, ind)) { res.status(200).json({ ok: false, error: "Recompensa ainda não desbloqueada — sincronize seu progresso primeiro." }); return; }
      const existing = await cmd(["HGET", "clube:cod:" + phone, reward]);
      if (existing) { res.status(200).json({ ok: true, code: existing, reward: def.label }); return; }
      let code = "";
      for (let i = 0; i < 5 && !code; i++) {
        const c = "BEN-" + crypto.randomBytes(3).toString("base64").replace(/[^A-Za-z0-9]/g, "").slice(0, 4).toUpperCase();
        if (c.length < 8) continue;
        const okNew = await cmd(["SET", "clube:resgate:" + c, JSON.stringify({ phone, reward, ts: Date.now(), used: 0 }), "NX"]);
        if (okNew === "OK") code = c;
      }
      if (!code) { res.status(500).json({ ok: false, error: "Tente novamente." }); return; }
      await cmd(["HSET", "clube:cod:" + phone, reward, code]);
      res.status(200).json({ ok: true, code, reward: def.label });
    } catch (e) { res.status(500).json({ ok: false, error: String((e && e.message) || e) }); }
    return;
  }

  res.status(400).json({ ok: false, error: "action" });
}
