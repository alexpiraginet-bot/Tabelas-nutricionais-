// Publica a tabela nutricional de um SKU no site público (painel /fichas.html,
// botão "Publicar tabela no site"). Em vez de gravar direto num banco, gera um
// COMMIT em src/data-overrides.js via API do GitHub: cada publicação fica
// versionada ("Publica tabela <sku> — rev NNN, por <nome>"), o build recalcula
// claims/lupa/CSVs sobre os valores publicados e a Vercel faz o deploy (~2 min).
// Auth: Bearer FICHAS_KEY/PANEL_KEY. Requer GITHUB_TOKEN (PAT com contents:write).
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
const KEYS = [process.env.FICHAS_KEY, process.env.PANEL_KEY].filter(Boolean);
const GH_TOKEN = process.env.FICHAS_GH_TOKEN || process.env.GITHUB_TOKEN;
const GH_REPO = process.env.FICHAS_GH_REPO || "alexpiraginet-bot/Tabelas-nutricionais-";
const FILE = "src/data-overrides.js";
const NUT_KEYS = ["kcal", "carbs", "sugars", "addedSugars", "protein", "fat", "satFat", "transFat", "fiber", "sodium"];

function authed(req) {
  const h = req.headers.authorization || "";
  const k = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (!k) return false;
  return KEYS.some((s) => {
    const a = Buffer.from(String(k)), b = Buffer.from(String(s));
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  });
}
async function kv(cmd) {
  const r = await fetch(KV_URL, {
    method: "POST",
    headers: { Authorization: "Bearer " + KV_TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
  });
  return (await r.json().catch(() => ({}))).result;
}
async function gh(path, opts = {}) {
  const r = await fetch(`https://api.github.com/repos/${GH_REPO}${path}`, {
    ...opts,
    headers: {
      Authorization: "Bearer " + GH_TOKEN,
      Accept: "application/vnd.github+json",
      "User-Agent": "bento-fichas-publish",
      ...(opts.headers || {}),
    },
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`GitHub ${r.status}: ${j.message || "erro"}`);
  return j;
}

// arquivo é JS ("export default {...};") para importar igual no Vite e no Node;
// o objeto em si é sempre JSON puro gravado por este endpoint
function parseOverrides(content) {
  const m = content.match(/export default ([\s\S]*?);\s*$/);
  if (!m) throw new Error("data-overrides.js em formato inesperado");
  return JSON.parse(m[1]);
}
const HEADER = `// Publicações do painel de fichas (/fichas.html → botão "Publicar tabela no site").
// GERADO pelo endpoint api/fichas-publish.js via commit — não editar manualmente:
// cada publicação vira um commit próprio ("Publica tabela <sku> — rev NNN"),
// preservando a trilha de auditoria exigida para dados de rotulagem.
// Formato: { [skuId]: { serving?, portionLabel?, nutrition?: {kcal, carbs, ...}, _pub: {by, at, rev} } }
`;

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") { res.status(405).end(); return; }
  if (!KEYS.length || !authed(req)) { res.status(401).json({ ok: false, error: "Senha incorreta." }); return; }
  if (!GH_TOKEN) { res.status(503).json({ ok: false, error: "Configure GITHUB_TOKEN (PAT com permissão contents:write no repositório) na Vercel para habilitar a publicação." }); return; }
  if (!KV_URL || !KV_TOKEN) { res.status(503).json({ ok: false, error: "Banco (Redis/KV) não configurado." }); return; }

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  const id = body && body.id, by = String((body && body.by) || "painel").slice(0, 60);
  if (!id || id === "_config") { res.status(400).json({ ok: false, error: "id" }); return; }

  // fonte da publicação = rascunho salvo no KV (o que a nutricionista vê é o que publica)
  let drafts = {};
  try {
    const raw = await kv(["GET", "fichas:drafts"]);
    drafts = raw ? JSON.parse(raw) : {};
  } catch (e) {
    res.status(502).json({ ok: false, error: "Não consegui ler os rascunhos no banco (KV) — tente novamente em instantes." });
    return;
  }
  const d = drafts[id];
  if (!d) { res.status(400).json({ ok: false, error: "Sem rascunho salvo para este SKU — salve antes de publicar." }); return; }

  const override = {};
  if (+d.serving > 0) override.serving = +d.serving;
  if (d.portionLabel && String(d.portionLabel).trim()) override.portionLabel = String(d.portionLabel).trim();
  if (d.nutrition && typeof d.nutrition === "object") {
    const n = {};
    for (const k of NUT_KEYS) {
      const v = +d.nutrition[k];
      if (Number.isFinite(v)) {
        if (v < 0) { res.status(400).json({ ok: false, error: `Valor negativo em ${k} — corrija antes de publicar.` }); return; }
        n[k] = v;
      }
    }
    if (Object.keys(n).length) override.nutrition = n;
  }
  if (!Object.keys(override).length) { res.status(400).json({ ok: false, error: "O rascunho não tem porção nem valores de tabela para publicar." }); return; }

  const rev = (+d._rev || 0) || 1;
  override._pub = { by, at: new Date().toISOString(), rev };

  try {
    const cur = await gh(`/contents/${FILE}?ref=main`);
    const overrides = parseOverrides(Buffer.from(cur.content, "base64").toString("utf8"));
    overrides[id] = override;
    const next = HEADER + "export default " + JSON.stringify(overrides, null, 1) + ";\n";
    const commit = await gh(`/contents/${FILE}`, {
      method: "PUT",
      body: JSON.stringify({
        message: `Publica tabela ${id} — rev ${String(rev).padStart(3, "0")} (por ${by}, via painel de fichas)`,
        content: Buffer.from(next, "utf8").toString("base64"),
        sha: cur.sha,
        branch: "main",
      }),
    });
    // registra no KV para o painel exibir o estado de publicação
    drafts[id] = { ...d, _pub: override._pub };
    await kv(["SET", "fichas:drafts", JSON.stringify(drafts)]);
    res.status(200).json({ ok: true, drafts, commit: commit.commit && commit.commit.html_url, pub: override._pub });
  } catch (e) {
    res.status(502).json({ ok: false, error: String(e.message || e) });
  }
}
