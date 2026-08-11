import { createHash } from "node:crypto";
import { MOVEMENT_PRIVACY_VERSION } from "./movement-rsvp.mjs";

export const PARTNER_TIER_OPTIONS = ["founding", "experience", "kit", "mobility", "support", "custom"];
export const PARTNER_CONTRIBUTION_TYPES = ["financial", "product", "service", "mixed", "other"];

function clean(value, max) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, max);
}

export function partnerLeadKey(email, companyName) {
  return createHash("sha256").update(`${clean(email, 160).toLowerCase()}|${clean(companyName, 120).toLowerCase()}`).digest("hex");
}

export function validatePartnerLead(body = {}) {
  const errors = {};
  const companyName = clean(body.companyName, 120);
  const contactName = clean(body.contactName, 120);
  const email = clean(body.email, 160).toLowerCase();
  const phone = clean(body.phone, 32);
  const tier = PARTNER_TIER_OPTIONS.includes(body.tier) ? body.tier : null;
  const contributionType = PARTNER_CONTRIBUTION_TYPES.includes(body.contributionType) ? body.contributionType : null;
  const contributionDetails = clean(body.contributionDetails, 1201);

  if (companyName.length < 2) errors.companyName = "Informe a marca ou empresa.";
  if (contactName.length < 2) errors.contactName = "Informe a pessoa responsável.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Informe um e-mail válido.";
  if (!tier) errors.tier = "Escolha uma cota de interesse.";
  if (!contributionType) errors.contributionType = "Escolha o tipo de contribuição.";
  if (contributionDetails.length > 1200) errors.contributionDetails = "Use até 1.200 caracteres.";
  if (body.privacyAccepted !== true) errors.privacyAccepted = "Confirme a leitura da Política de Privacidade.";
  if (body.siteUrl) errors.siteUrl = "Não foi possível registrar o interesse.";

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      companyName,
      contactName,
      email,
      phone,
      tier,
      contributionType,
      contributionDetails,
      privacyVersion: MOVEMENT_PRIVACY_VERSION,
      isBinding: false,
    },
  };
}
