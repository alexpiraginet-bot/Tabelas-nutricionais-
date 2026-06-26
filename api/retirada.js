// Tela de retirada da loja: lista SÓ as pré-vendas marcadas como "pago" no painel,
// para os atendentes liberarem. GET/POST protegidos por PANEL_KEY ou LOJA_KEY.
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
const LOJA_KEY = process.env.LOJA_KEY; // opcional: senha mais simples só p/ a loja

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
function authed(req) {
  const k = getKey(req);
  return eq(k, PANEL_KEY) || eq(k, LOJA_KEY);
}
function readRaw(req) {
  if (req.body !== undefined && req.body !== null) return Promise.resolve(req.body);
  return new Promise((resolve) => {
    let d = ""; req.on("data", (c) => { d += c; if (d.length > 16384) d = d.slice(0, 16384); });
    req.on("end", () => resolve(d)); req.on("error", () => resolve(""));
  });
}
function clean(s, max) { let o = ""; for (const ch of String(s)) if (ch.codePointAt(0) >= 32) o += ch; return o.slice(0, max); }
async function cmd(args) {
  const r = await fetch(KV_URL, { method: "POST", headers: { Authorization: "Bearer " + KV_TOKEN, "Content-Type": "application/json" }, body: JSON.stringify(args) });
  const j = await r.json(); return j.result;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!PANEL_KEY && !LOJA_KEY) { res.status(503).json({ error: "Defina LOJA_KEY (ou PANEL_KEY) no projeto." }); return; }
  if (!authed(req)) { res.status(401).json({ error: "Senha incorreta." }); return; }
  if (!KV_URL || !KV_TOKEN) { res.status(503).json({ error: "Banco (Redis/KV) não configurado." }); return; }

  // status efetivo (hash sobrescreve o original)
  async function statusMap() {
    const out = {};
    try { const flat = (await cmd(["HGETALL", "prevendas:status"])) || []; for (let i = 0; i < flat.length; i += 2) out[flat[i]] = flat[i + 1]; } catch { /* */ }
    return out;
  }

  const STORES = ["Praia do Canto", "Jardim Camburi"];
  const FLAVS = ["Opereta", "Pistache Perfeito", "Chocolate Dubai"];

  // POST: marcar retirado, ou salvar o estoque compartilhado da loja
  if (req.method === "POST") {
    let body = await readRaw(req);
    if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
    if (!body || typeof body !== "object") body = {};
    // Estoque compartilhado (na nuvem) — todos os atendentes veem o mesmo
    if (body.action === "estoque") {
      const src = (body.estoque && typeof body.estoque === "object") ? body.estoque : {};
      const out = {};
      STORES.forEach((st) => { out[st] = {}; FLAVS.forEach((fl) => { const v = Number(src[st] && src[st][fl]); out[st][fl] = (isFinite(v) && v > 0) ? Math.min(99999, Math.floor(v)) : 0; }); });
      try { await cmd(["SET", "prevendas:estoque", JSON.stringify(out)]); res.status(200).json({ ok: true }); }
      catch (e) { res.status(500).json({ error: String((e && e.message) || e) }); }
      return;
    }
    const code = clean(body.code || "", 120);
    if (!code) { res.status(400).json({ error: "code" }); return; }
    const novo = body.action === "retirado" ? "retirado" : clean(body.status || "retirado", 120);
    // soma os sabores de um pedido (entende o mix novo e os antigos de 1 sabor)
    function parseSab(sabor, qty) {
      const out = {}; FLAVS.forEach((f) => out[f] = 0);
      const s = String(sabor || "");
      if (/×\s*\d/.test(s)) { s.split("·").forEach((part) => { const m = part.match(/^\s*(.+?)\s*×\s*(\d+)\s*$/); if (m && Object.prototype.hasOwnProperty.call(out, m[1].trim())) out[m[1].trim()] = Number(m[2]); }); }
      else if (s.trim() && Object.prototype.hasOwnProperty.call(out, s.trim())) { out[s.trim()] = Number(qty) || 1; }
      return out;
    }
    try {
      // Ao ENTREGAR (retirado), baixa automaticamente o estoque daquele pedido — uma única vez.
      if (novo === "retirado") {
        const cur = await statusMap();
        if (cur[code] !== "retirado") {
          try {
            const raw = (await cmd(["LRANGE", "prevendas", 0, 499])) || [];
            let ped = null;
            for (const x of raw) { try { const o = JSON.parse(x); if (o && o.code === code) { ped = o; break; } } catch { /* */ } }
            if (ped) {
              try { const e = await cmd(["HGET", "prevendas:edit", code]); if (e) { const o = JSON.parse(e); if (o.sabor != null) ped.sabor = o.sabor; if (o.qty != null) ped.qty = o.qty; } } catch { /* */ }
              const store = ped.unidade;
              if (STORES.indexOf(store) >= 0) {
                const counts = parseSab(ped.sabor, ped.qty);
                let est = {}; try { est = JSON.parse((await cmd(["GET", "prevendas:estoque"])) || "{}"); } catch { /* */ }
                STORES.forEach((s) => { if (!est[s]) est[s] = {}; FLAVS.forEach((fl) => { if (est[s][fl] == null) est[s][fl] = 0; }); });
                FLAVS.forEach((fl) => { est[store][fl] = Math.max(0, (Number(est[store][fl]) || 0) - (counts[fl] || 0)); });
                await cmd(["SET", "prevendas:estoque", JSON.stringify(est)]);
              }
            }
          } catch { /* nunca bloqueia a entrega */ }
        }
      }
      await cmd(["HSET", "prevendas:status", code, novo]);
      res.status(200).json({ ok: true });
    }
    catch (e) { res.status(500).json({ error: String((e && e.message) || e) }); }
    return;
  }

  // GET: lista só os pagos + estoque compartilhado
  if (req.method === "GET") {
    try {
      const raw = (await cmd(["LRANGE", "prevendas", 0, 499])) || [];
      const st = await statusMap();
      // overrides de sabores/qtd (mesma edição do painel admin)
      let ed = {};
      try { const flat = (await cmd(["HGETALL", "prevendas:edit"])) || []; for (let i = 0; i < flat.length; i += 2) ed[flat[i]] = flat[i + 1]; } catch { /* */ }
      const pagos = raw.map((x) => { try { return JSON.parse(x); } catch { return null; } }).filter(Boolean)
        .map((p) => {
          if (p.code && st[p.code]) p.status = st[p.code];
          if (p.code && ed[p.code]) { try { const o = JSON.parse(ed[p.code]); if (o.sabor != null) p.sabor = o.sabor; if (o.qty != null) p.qty = o.qty; } catch { /* */ } }
          return p;
        })
        .filter((p) => p.status === "pago")
        .map((p) => ({ code: p.code, nome: p.nome, phone: p.phone, sabor: p.sabor, qty: p.qty, unidade: p.unidade, ts: p.ts }));
      let estoque = {};
      try { estoque = JSON.parse((await cmd(["GET", "prevendas:estoque"])) || "{}"); } catch { /* */ }
      res.status(200).json({ ok: true, updatedAt: Date.now(), pagos, estoque });
    } catch (e) { res.status(500).json({ error: String((e && e.message) || e) }); }
    return;
  }

  res.status(405).end();
}
