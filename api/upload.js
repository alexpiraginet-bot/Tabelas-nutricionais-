// Upload de artes/fotos para o Supabase Storage (bucket público "artes").
// O painel pede uma URL assinada aqui (PANEL_KEY) e o navegador envia o arquivo
// DIRETO ao Supabase — sem limite de payload da Vercel e sem expor a service key.
// Env necessárias no projeto: SUPABASE_URL e SUPABASE_SERVICE_KEY.
import crypto from "node:crypto";

const PANEL_KEY = process.env.PANEL_KEY;
const SB_URL = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
const SB_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const BUCKET = process.env.SUPABASE_BUCKET || "artes";

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
function readRaw(req) {
  if (req.body !== undefined && req.body !== null) return Promise.resolve(req.body);
  return new Promise((resolve) => {
    let d = ""; req.on("data", (c) => { d += c; if (d.length > 8192) d = d.slice(0, 8192); });
    req.on("end", () => resolve(d)); req.on("error", () => resolve(""));
  });
}
// nome-de-arquivo seguro: minúsculo, sem acentos/espaços, mantém extensão
function slugName(name) {
  const s = String(name || "arquivo").toLowerCase();
  const dot = s.lastIndexOf(".");
  const ext = dot > 0 ? s.slice(dot + 1).replace(/[^a-z0-9]/g, "").slice(0, 5) : "bin";
  const base = (dot > 0 ? s.slice(0, dot) : s)
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9-_]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "arquivo";
  return base + "." + ext;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!PANEL_KEY) { res.status(503).json({ ok: false, error: "PANEL_KEY não configurada." }); return; }
  if (!eq(getKey(req), PANEL_KEY)) { res.status(401).json({ ok: false, error: "Senha incorreta." }); return; }

  // GET: o painel checa se o Supabase está configurado (sem expor chaves)
  if (req.method === "GET") {
    res.status(200).json({ ok: true, configured: !!(SB_URL && SB_KEY), bucket: BUCKET, publicBase: SB_URL ? `${SB_URL}/storage/v1/object/public/${BUCKET}/` : null });
    return;
  }
  if (req.method !== "POST") { res.status(405).end(); return; }
  if (!SB_URL || !SB_KEY) { res.status(503).json({ ok: false, error: "Configure SUPABASE_URL e SUPABASE_SERVICE_KEY no projeto (Vercel → Settings → Environment Variables) e faça redeploy." }); return; }

  let body = await readRaw(req);
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  if (!body || typeof body !== "object") body = {};

  if (body.action === "sign") {
    const name = slugName(body.name);
    const stamp = new Date().toISOString().slice(0, 10);
    const path = `${stamp}/${name}`;
    try {
      const r = await fetch(`${SB_URL}/storage/v1/object/upload/sign/${BUCKET}/${path}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.url) { res.status(500).json({ ok: false, error: j.message || j.error || ("Supabase " + r.status) }); return; }
      res.status(200).json({
        ok: true,
        uploadUrl: `${SB_URL}/storage/v1${j.url}`,           // PUT do arquivo direto aqui
        publicUrl: `${SB_URL}/storage/v1/object/public/${BUCKET}/${path}`,
        path,
      });
    } catch (e) { res.status(500).json({ ok: false, error: String((e && e.message) || e) }); }
    return;
  }

  res.status(400).json({ ok: false, error: "action" });
}
