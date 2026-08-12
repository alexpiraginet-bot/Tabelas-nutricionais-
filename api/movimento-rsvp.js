import { claimMovementInviteResponse, readMovementJsonBody, resolveMovementInvite } from "../lib/movement-invite.mjs";
import { validateRsvpPayload } from "../lib/movement-rsvp.mjs";
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

function safeSupabaseInfo(url, key) {
  try {
    const parsed = new URL(url);
    const hostname = /^[a-z0-9.-]+$/i.test(parsed.hostname) ? parsed.hostname : "invalid";
    const pathname = /^\/[a-z0-9/_-]*$/i.test(parsed.pathname) ? parsed.pathname : "invalid";
    const keyKind = String(key).startsWith("sb_secret_") ? "secret" : String(key).startsWith("eyJ") ? "jwt" : "other";
    return { supabaseHost: hostname, supabasePath: pathname, keyKind };
  } catch {
    return { supabaseHost: "invalid", supabasePath: "invalid", keyKind: "unknown" };
  }
}

async function fetchCurrentRsvp({ fetchImpl, cfg, inviteId }) {
  const select = "response,participation_mode,shirt_size,training_outfit_size,adult_companion_type,companion_count,child_count,child_age,child_kit_size,transport_interest,image_consent,privacy_version,updated_at";
  const url = `${cfg.url}/rest/v1/movement_rsvps?invite_id=eq.${encodeURIComponent(inviteId)}&select=${select}&limit=1`;
  const response = await fetchImpl(url, { headers: supabaseServiceHeaders(cfg.key) });
  if (!response.ok) return null;
  const rows = await response.json();
  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row || !row.response) return null;
  return {
    response: row.response,
    participationMode: row.participation_mode,
    shirtSize: row.shirt_size,
    trainingOutfitSize: row.training_outfit_size,
    adultCompanionType: row.adult_companion_type,
    companionCount: row.companion_count || 0,
    childCount: row.child_count || 0,
    childAge: row.child_age ?? null,
    childKitSize: row.child_kit_size,
    transportInterest: row.transport_interest === true,
    imageConsent: row.image_consent === true,
    privacyVersion: row.privacy_version,
    updatedAt: row.updated_at,
  };
}

async function fetchCurrentPartnerLead({ fetchImpl, cfg, inviteId }) {
  const select = "tier_interest,contribution_type,contribution_details,email,phone";
  const url = `${cfg.url}/rest/v1/movement_partner_leads?invite_id=eq.${encodeURIComponent(inviteId)}&select=${select}&limit=1`;
  const response = await fetchImpl(url, { headers: supabaseServiceHeaders(cfg.key) });
  if (!response.ok) return null;
  const rows = await response.json();
  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row) return null;
  return {
    tier: row.tier_interest || "",
    contributionType: row.contribution_type || "",
    contributionDetails: row.contribution_details || "",
    email: row.email || "",
    phone: row.phone || "",
  };
}

export function createMovementHandler({ fetchImpl = fetch, env = process.env, now = () => new Date() } = {}) {
  return async function movementHandler(req, res) {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
    if (req.method !== "GET" && req.method !== "POST") { res.status(405).end(); return; }
    if (!originOk(req)) { res.status(403).json({ ok: false, error: "Origem não autorizada." }); return; }

    const cfg = config(env);
    if (!cfg.url || !cfg.key) { res.status(503).json({ ok: false, error: "Confirmação temporariamente indisponível." }); return; }

    try {
      if (req.method === "GET") {
        const timestampDate = now();
        let invite = await resolveMovementInvite({ fetchImpl, cfg, token: req.query?.token, now: timestampDate, markOpened: false });
        if (!invite) { res.status(404).json({ ok: false, error: "Convite inválido ou expirado." }); return; }
        invite = await resolveMovementInvite({ fetchImpl, cfg, token: req.query?.token, now: timestampDate, markOpened: true });
        if (!invite) { res.status(404).json({ ok: false, error: "Convite inválido ou expirado." }); return; }
        if (invite.audienceType === "influencer") {
          const currentRsvp = await fetchCurrentRsvp({ fetchImpl, cfg, inviteId: invite.id });
          res.status(200).json({ ok: true, invite, currentRsvp });
          return;
        }
        const currentPartnerLead = await fetchCurrentPartnerLead({ fetchImpl, cfg, inviteId: invite.id });
        res.status(200).json({ ok: true, invite, currentPartnerLead });
        return;
      }

      const bodyResult = await readMovementJsonBody(req);
      if (!bodyResult.ok) { res.status(413).json({ ok: false, error: "Envio muito grande." }); return; }
      const body = bodyResult.value;
      if (body.siteUrl) { res.status(400).json({ ok: false, error: "Não foi possível registrar a resposta." }); return; }
      const timestampDate = now();
      const invite = await resolveMovementInvite({ fetchImpl, cfg, token: body.token, now: timestampDate, markOpened: false });
      if (!invite || invite.audienceType !== "influencer") { res.status(404).json({ ok: false, error: "Convite inválido ou expirado." }); return; }
      const valid = validateRsvpPayload(body);
      if (!valid.ok) { res.status(400).json({ ok: false, error: "Revise os campos indicados.", fields: valid.errors }); return; }
      const claimed = await claimMovementInviteResponse({ fetchImpl, cfg, inviteId: invite.id, now: timestampDate });
      if (!claimed) { res.status(404).json({ ok: false, error: "Convite inválido ou expirado." }); return; }

      const timestamp = timestampDate.toISOString();
      const row = {
        invite_id: invite.id,
        response: valid.value.response,
        participation_mode: valid.value.participationMode,
        shirt_size: valid.value.shirtSize,
        training_outfit_size: valid.value.trainingOutfitSize,
        adult_companion_type: valid.value.adultCompanionType,
        companion_count: valid.value.companionCount,
        child_count: valid.value.childCount,
        child_age: valid.value.childAge,
        child_kit_size: valid.value.childKitSize,
        transport_interest: valid.value.transportInterest,
        privacy_version: valid.value.privacyVersion,
        image_consent: valid.value.imageConsent,
        responded_at: timestamp,
        updated_at: timestamp,
      };
      const upsertUrl = `${cfg.url}/rest/v1/movement_rsvps?on_conflict=invite_id`;
      const persisted = await fetchImpl(upsertUrl, {
        method: "POST",
        headers: supabaseServiceHeaders(cfg.key, { Prefer: "resolution=merge-duplicates,return=representation" }),
        body: JSON.stringify(row),
      });
      if (!persisted.ok) throw new Error(`Supabase ${persisted.status}`);
      res.status(200).json({ ok: true, reference: invite.id.slice(0, 8).toUpperCase(), response: valid.value.response, updatedAt: timestamp });
    } catch (error) {
      console.error("[movement-rsvp] upstream failure", {
        ...safeSupabaseInfo(cfg.url, cfg.key),
        error: error instanceof Error ? error.message : "Unknown error",
      });
      res.status(502).json({ ok: false, error: "Não foi possível registrar agora. Tente novamente." });
    }
  };
}

export default createMovementHandler();
