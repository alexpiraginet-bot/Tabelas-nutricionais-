import { partnerLeadKey, validatePartnerLead } from "../lib/movement-partner.mjs";
import { normalizeSupabaseBaseUrl } from "../lib/supabase-rest.mjs";

const ALLOWED_HOSTS = ["bentogelateria.com", "localhost", "127.0.0.1"];

function originOk(req) {
  const raw = req.headers?.origin || req.headers?.referer || "";
  if (!raw) return true;
  try {
    const host = new URL(raw).hostname;
    return ALLOWED_HOSTS.includes(host) || host.endsWith(".bentogelateria.com") || host.endsWith(".vercel.app");
  } catch {
    return false;
  }
}

async function readBody(req) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === "string") {
      try { return JSON.parse(req.body); } catch { return {}; }
    }
    return req.body;
  }
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => { if (data.length < 32768) data += chunk; });
    req.on("end", () => { try { resolve(JSON.parse(data || "{}")); } catch { resolve({}); } });
    req.on("error", () => resolve({}));
  });
}

function config(env) {
  return {
    url: normalizeSupabaseBaseUrl(env.SUPABASE_URL),
    key: env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY || "",
  };
}

function headers(key, extra = {}) {
  return { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...extra };
}

export function createPartnerLeadHandler({ fetchImpl = fetch, env = process.env, now = () => new Date() } = {}) {
  return async function partnerLeadHandler(req, res) {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
    if (req.method !== "POST") { res.status(405).end(); return; }
    if (!originOk(req)) { res.status(403).json({ ok: false, error: "Origem não autorizada." }); return; }

    const cfg = config(env);
    if (!cfg.url || !cfg.key) { res.status(503).json({ ok: false, error: "Formulário temporariamente indisponível." }); return; }

    const body = await readBody(req);
    const valid = validatePartnerLead(body);
    if (!valid.ok) { res.status(400).json({ ok: false, error: "Revise os campos indicados.", fields: valid.errors }); return; }

    try {
      const timestamp = now().toISOString();
      const value = valid.value;
      const row = {
        lead_key: partnerLeadKey(value.email, value.companyName),
        company_name: value.companyName,
        contact_name: value.contactName,
        email: value.email,
        phone: value.phone || null,
        tier_interest: value.tier,
        contribution_type: value.contributionType,
        contribution_details: value.contributionDetails || null,
        privacy_version: value.privacyVersion,
        is_binding: false,
        submitted_at: timestamp,
        updated_at: timestamp,
      };
      const response = await fetchImpl(`${cfg.url}/rest/v1/movement_partner_leads?on_conflict=lead_key`, {
        method: "POST",
        headers: headers(cfg.key, { Prefer: "resolution=merge-duplicates,return=representation" }),
        body: JSON.stringify(row),
      });
      if (!response.ok) throw new Error(`Supabase ${response.status}`);
      const rows = await response.json();
      const id = Array.isArray(rows) ? rows[0]?.id : null;
      res.status(200).json({ ok: true, reference: id ? id.slice(0, 8).toUpperCase() : "RECEBIDO", updatedAt: timestamp });
    } catch {
      res.status(502).json({ ok: false, error: "Não foi possível registrar agora. Tente novamente." });
    }
  };
}

export default createPartnerLeadHandler();
