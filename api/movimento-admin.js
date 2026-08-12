import crypto from "node:crypto";
import { readMovementJsonBody } from "../lib/movement-invite.mjs";
import { hashInviteToken, validateAudienceType } from "../lib/movement-rsvp.mjs";
import { normalizeSupabaseBaseUrl } from "../lib/supabase-rest.mjs";

function panelAuthorized(req, env) {
  const expected = String(env.PANEL_KEY || "");
  const authorization = String(req.headers?.authorization || "");
  const provided = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!expected || !provided) return false;
  const expectedHash = crypto.createHash("sha256").update(expected, "utf8").digest();
  const providedHash = crypto.createHash("sha256").update(provided, "utf8").digest();
  return crypto.timingSafeEqual(expectedHash, providedHash);
}

function config(env) {
  return {
    url: normalizeSupabaseBaseUrl(env.SUPABASE_URL),
    key: env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY || "",
  };
}

function headers(key) {
  return { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
}

function cleanText(value, maxLength) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, maxLength);
}

async function fetchRows(fetchImpl, url, key) {
  const response = await fetchImpl(url, { headers: headers(key) });
  if (!response.ok) throw new Error(`Supabase ${response.status}`);
  const rows = await response.json();
  return Array.isArray(rows) ? rows : [];
}

function publicRsvp(row) {
  if (!row) return null;
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
    respondedAt: row.responded_at,
    updatedAt: row.updated_at,
  };
}

export function createMovementAdminHandler({ fetchImpl = fetch, env = process.env, createToken = () => `invite_${crypto.randomBytes(32).toString("base64url")}`, now = () => new Date() } = {}) {
  return async function movementAdminHandler(req, res) {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
    if (req.method !== "GET" && req.method !== "POST") { res.status(405).end(); return; }
    if (!panelAuthorized(req, env)) { res.status(401).json({ ok: false, error: "Não autorizado." }); return; }

    const cfg = config(env);
    if (!cfg.url || !cfg.key) { res.status(503).json({ ok: false, error: "Movimento temporariamente indisponível." }); return; }

    try {
      if (req.method === "POST") {
        const bodyResult = await readMovementJsonBody(req);
        if (!bodyResult.ok) { res.status(413).json({ ok: false, error: "Envio muito grande." }); return; }
        const body = bodyResult.value;

        if (body.action === "revoke-invite") {
          const inviteId = cleanText(body.inviteId, 64);
          if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(inviteId)) {
            res.status(400).json({ ok: false, error: "Identificador de convite inválido." });
            return;
          }
          const timestamp = now().toISOString();
          const response = await fetchImpl(`${cfg.url}/rest/v1/movement_invites?id=eq.${encodeURIComponent(inviteId)}`, {
            method: "PATCH",
            headers: { ...headers(cfg.key), Prefer: "return=representation" },
            body: JSON.stringify({ status: "revoked", revoked_at: timestamp, updated_at: timestamp }),
          });
          if (!response.ok) throw new Error(`Supabase ${response.status}`);
          const rows = await response.json();
          const invite = Array.isArray(rows) ? rows[0] : null;
          if (!invite?.id) { res.status(404).json({ ok: false, error: "Convite não encontrado." }); return; }
          res.status(200).json({ ok: true, invite: { id: invite.id, status: invite.status, revokedAt: invite.revoked_at } });
          return;
        }

        if (body.action !== "create-invite") { res.status(400).json({ ok: false, error: "Ação inválida." }); return; }
        const audience = validateAudienceType(body.audienceType);
        if (!audience.ok) { res.status(400).json({ ok: false, error: audience.error }); return; }
        const companyName = cleanText(body.companyName, 120);
        const requestedDisplayName = cleanText(body.displayName, 120);
        const recipientName = cleanText(body.recipientName || (audience.value === "influencer" ? requestedDisplayName : ""), 120);
        const displayName = audience.value === "partner" ? companyName : requestedDisplayName;
        const contact = cleanText(body.contact, 160);
        if (audience.value === "influencer" && !displayName) { res.status(400).json({ ok: false, error: "Informe o nome da convidada." }); return; }
        if (audience.value === "partner" && companyName.length < 2) { res.status(400).json({ ok: false, error: "Informe a empresa parceira." }); return; }
        if (audience.value === "partner" && recipientName.length < 2) { res.status(400).json({ ok: false, error: "Informe a pessoa responsável." }); return; }
        const expiresAtMs = Date.parse(String(body.expiresAt || ""));
        if (!Number.isFinite(expiresAtMs) || expiresAtMs <= now().getTime()) { res.status(400).json({ ok: false, error: "Escolha uma validade futura para o convite." }); return; }

        const token = createToken();
        const row = {
          token_hash: hashInviteToken(token),
          audience_type: audience.value,
          display_name: displayName,
          recipient_name: recipientName,
          company_name: audience.value === "partner" ? companyName : null,
          contact: contact || null,
          status: "sent",
          expires_at: new Date(expiresAtMs).toISOString(),
        };
        const response = await fetchImpl(`${cfg.url}/rest/v1/movement_invites`, {
          method: "POST",
          headers: { ...headers(cfg.key), Prefer: "return=representation" },
          body: JSON.stringify(row),
        });
        if (!response.ok) throw new Error(`Supabase ${response.status}`);
        const rows = await response.json();
        const invite = Array.isArray(rows) ? rows[0] : null;
        if (!invite?.id) throw new Error("Supabase returned no invitation");
        res.status(201).json({
          ok: true,
          invitePath: `/movimento/convite/${token}`,
          invite: {
            id: invite.id,
            displayName: invite.display_name,
            audienceType: invite.audience_type,
            recipientName: invite.recipient_name,
            companyName: invite.company_name,
            contact: invite.contact,
            status: invite.status,
            expiresAt: invite.expires_at,
            createdAt: invite.created_at,
          },
        });
        return;
      }

      const inviteSelect = "id,display_name,recipient_name,company_name,contact,audience_type,status,opened_at,revoked_at,expires_at,created_at";
      const rsvpSelect = "invite_id,response,participation_mode,shirt_size,training_outfit_size,adult_companion_type,companion_count,child_count,child_age,child_kit_size,transport_interest,image_consent,responded_at,updated_at";
      const partnerSelect = "id,invite_id,company_name,contact_name,email,phone,tier_interest,contribution_type,contribution_details,submitted_at,updated_at";
      const [inviteRows, rsvpRows, partnerRows] = await Promise.all([
        fetchRows(fetchImpl, `${cfg.url}/rest/v1/movement_invites?select=${inviteSelect}&order=created_at.desc&limit=500`, cfg.key),
        fetchRows(fetchImpl, `${cfg.url}/rest/v1/movement_rsvps?select=${rsvpSelect}&order=updated_at.desc&limit=500`, cfg.key),
        fetchRows(fetchImpl, `${cfg.url}/rest/v1/movement_partner_leads?select=${partnerSelect}&order=updated_at.desc&limit=500`, cfg.key),
      ]);
      const rsvpByInvite = new Map(rsvpRows.map((row) => [row.invite_id, row]));
      const partnerByInvite = new Map(partnerRows.filter((row) => row.invite_id).map((row) => [row.invite_id, row]));
      const invites = inviteRows.map((row) => ({
        id: row.id,
        displayName: row.display_name,
        recipientName: row.recipient_name,
        companyName: row.company_name,
        contact: row.contact,
        audienceType: row.audience_type,
        status: row.status,
        openedAt: row.opened_at,
        revokedAt: row.revoked_at,
        expiresAt: row.expires_at,
        createdAt: row.created_at,
        rsvp: publicRsvp(rsvpByInvite.get(row.id)),
        partnerLead: partnerByInvite.has(row.id) ? { id: partnerByInvite.get(row.id).id, updatedAt: partnerByInvite.get(row.id).updated_at } : null,
      }));
      const partners = partnerRows.map((row) => ({
        id: row.id,
        inviteId: row.invite_id,
        companyName: row.company_name,
        contactName: row.contact_name,
        email: row.email,
        phone: row.phone,
        tierInterest: row.tier_interest,
        contributionType: row.contribution_type,
        contributionDetails: row.contribution_details,
        submittedAt: row.submitted_at,
        updatedAt: row.updated_at,
      }));
      const summary = {
        invited: invites.length,
        confirmed: invites.filter((invite) => invite.rsvp?.response === "confirmed").length,
        declined: invites.filter((invite) => invite.rsvp?.response === "declined").length,
        pending: invites.filter((invite) => !invite.rsvp && !invite.partnerLead).length,
        partnerLeads: partners.length,
      };
      res.status(200).json({ ok: true, summary, invites, partners, updatedAt: new Date().toISOString() });
    } catch {
      res.status(502).json({ ok: false, error: "Não foi possível carregar o Movimento agora." });
    }
  };
}

export default createMovementAdminHandler();
