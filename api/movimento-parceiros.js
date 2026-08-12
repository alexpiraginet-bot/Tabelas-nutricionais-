import { partnerLeadKey, validatePartnerLead } from "../lib/movement-partner.mjs";
import { claimMovementInviteResponse, readMovementJsonBody, resolveMovementInvite } from "../lib/movement-invite.mjs";
import { normalizeSupabaseBaseUrl, supabaseServiceHeaders } from "../lib/supabase-rest.mjs";

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

function config(env) {
  return {
    url: normalizeSupabaseBaseUrl(env.SUPABASE_URL),
    key: env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY || "",
  };
}

export function createPartnerLeadHandler({ fetchImpl = fetch, env = process.env, now = () => new Date() } = {}) {
  return async function partnerLeadHandler(req, res) {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
    if (req.method !== "POST") { res.status(405).end(); return; }
    if (!originOk(req)) { res.status(403).json({ ok: false, error: "Origem não autorizada." }); return; }

    const cfg = config(env);
    if (!cfg.url || !cfg.key) { res.status(503).json({ ok: false, error: "Formulário temporariamente indisponível." }); return; }

    const bodyResult = await readMovementJsonBody(req);
    if (!bodyResult.ok) { res.status(413).json({ ok: false, error: "Envio muito grande." }); return; }
    const body = bodyResult.value;

    try {
      const timestampDate = now();
      const timestamp = timestampDate.toISOString();
      const hasPersonalToken = typeof body.token === "string" && body.token.trim() !== "";
      let invite = hasPersonalToken
        ? await resolveMovementInvite({ fetchImpl, cfg, token: body.token, now: timestampDate, markOpened: false })
        : null;
      if (hasPersonalToken && (!invite || invite.audienceType !== "partner")) {
        res.status(409).json({ ok: false, error: "Não foi possível registrar este convite." });
        return;
      }
      const valid = validatePartnerLead(invite ? { ...body, companyName: invite.companyName, contactName: invite.recipientName } : body);
      if (!valid.ok) { res.status(400).json({ ok: false, error: "Revise os campos indicados.", fields: valid.errors }); return; }
      if (invite) {
        invite = await resolveMovementInvite({ fetchImpl, cfg, token: body.token, now: timestampDate, markOpened: true });
        if (!invite) { res.status(409).json({ ok: false, error: "Não foi possível registrar este convite." }); return; }
      }
      const value = valid.value;
      if (invite) {
        const claimed = await claimMovementInviteResponse({ fetchImpl, cfg, inviteId: invite.id, now: timestampDate });
        if (!claimed) { res.status(409).json({ ok: false, error: "Não foi possível registrar este convite." }); return; }
      }
      const row = {
        lead_key: partnerLeadKey(value.email, value.companyName),
        ...(invite ? { invite_id: invite.id } : {}),
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
      const response = await fetchImpl(`${cfg.url}/rest/v1/movement_partner_leads?on_conflict=${invite ? "invite_id" : "lead_key"}`, {
        method: "POST",
        headers: supabaseServiceHeaders(cfg.key, { Prefer: "resolution=merge-duplicates,return=representation" }),
        body: JSON.stringify(row),
      });
      if (!response.ok && invite && response.status === 409) {
        res.status(409).json({ ok: false, error: "Não foi possível registrar este convite." });
        return;
      }
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
