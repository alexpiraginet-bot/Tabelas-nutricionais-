import crypto from "node:crypto";

export const OUTFIT_SIZES = Object.freeze(["PP", "P", "M", "G", "GG", "XGG"]);
export const SHIRT_SIZES = OUTFIT_SIZES;
export const TRAINING_OUTFIT_SIZES = OUTFIT_SIZES;
export const ADULT_COMPANION_TYPES = Object.freeze(["husband", "mother"]);
export const PARTICIPATION_MODES = Object.freeze(["training", "lounge", "family"]);
export const INVITE_AUDIENCE_TYPES = Object.freeze(["influencer", "partner"]);
export const MOVEMENT_PRIVACY_VERSION = "2026-08-11";

function cleanText(value, maxLength) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function parseChildAge(value) {
  if (typeof value === "number") return Number.isInteger(value) ? value : null;
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return /^-?\d+$/.test(normalized) ? Number(normalized) : null;
}

export function validateToken(value) {
  const token = typeof value === "string" ? value.trim() : "";
  const ok = token.length >= 32 && token.length <= 160 && /^[A-Za-z0-9_-]+$/.test(token);
  return ok ? { ok: true, value: token } : { ok: false, error: "Convite inválido." };
}

export function hashInviteToken(value) {
  const token = validateToken(value);
  if (!token.ok) throw new TypeError(token.error);
  return crypto.createHash("sha256").update(token.value, "utf8").digest("hex");
}

export function validateAudienceType(value) {
  return INVITE_AUDIENCE_TYPES.includes(value)
    ? { ok: true, value }
    : { ok: false, error: "Público do convite inválido." };
}

export function validateRsvpPayload(input) {
  const body = input && typeof input === "object" ? input : {};
  const errors = {};
  const response = body.response === "confirmed" || body.response === "declined" ? body.response : null;
  const explicitOutfitSize = typeof body.outfitSize === "string" ? body.outfitSize.trim().toUpperCase() : "";
  const legacyShirtSize = typeof body.shirtSize === "string" ? body.shirtSize.trim().toUpperCase() : "";
  const legacyTrainingOutfitSize = typeof body.trainingOutfitSize === "string" ? body.trainingOutfitSize.trim().toUpperCase() : "";
  const legacyOutfitSize = legacyShirtSize && legacyShirtSize === legacyTrainingOutfitSize ? legacyShirtSize : "";
  const outfitSize = explicitOutfitSize || legacyOutfitSize;
  const participationMode = PARTICIPATION_MODES.includes(body.participationMode) ? body.participationMode : null;
  const adultCompanionRaw = cleanText(body.adultCompanionType, 24);
  const adultCompanionType = ADULT_COMPANION_TYPES.includes(adultCompanionRaw) ? adultCompanionRaw : null;
  const companionCount = Number.isInteger(Number(body.companionCount)) ? Number(body.companionCount) : 0;
  const childCount = Number.isInteger(Number(body.childCount)) ? Number(body.childCount) : 0;
  const childAgeProvided = body.childAge !== undefined && body.childAge !== null && (typeof body.childAge !== "string" || body.childAge.trim() !== "");
  const childAge = childAgeProvided ? parseChildAge(body.childAge) : null;
  const childKitSize = cleanText(body.childKitSize, Number.MAX_SAFE_INTEGER);
  const transportInterest = body.transportInterest === undefined ? false : body.transportInterest;
  const expectedCompanionCount = (adultCompanionType ? 1 : 0) + childCount;

  if (body.siteUrl) errors.siteUrl = "Envio inválido.";
  if (!response) errors.response = "Escolha uma resposta.";
  if (response === "confirmed" && !OUTFIT_SIZES.includes(outfitSize)) errors.outfitSize = "Escolha o seu tamanho.";
  if (response === "confirmed" && adultCompanionRaw && !adultCompanionType) errors.adultCompanionType = "Escolha marido ou mãe como acompanhante adulto.";
  if (response === "confirmed" && (companionCount < 0 || companionCount > 2 || companionCount !== expectedCompanionCount)) errors.companionCount = "O convite permite até dois acompanhantes: marido ou mãe e uma criança.";
  if (response === "confirmed" && (childCount < 0 || childCount > 1)) errors.childCount = "O convite permite uma criança.";
  if (response === "confirmed" && childCount === 1 && !childKitSize) errors.childKitSize = "Informe um tamanho aproximado para a criança.";
  if (response === "confirmed" && childCount === 1 && childKitSize.length > 40) errors.childKitSize = "Use até 40 caracteres para o tamanho aproximado da criança.";
  if (response === "confirmed" && childCount === 1 && (childAge === null || childAge < 0 || childAge > 120)) errors.childAge = "Informe uma idade inteira entre 0 e 120 para a organização.";
  if (response === "confirmed" && childCount !== 1 && childAgeProvided) errors.childAge = "Informe a idade apenas quando houver uma criança.";
  if (response === "confirmed" && childCount !== 1 && childKitSize) errors.childKitSize = "Informe o tamanho apenas quando houver uma criança.";
  if (typeof transportInterest !== "boolean") errors.transportInterest = "Resposta inválida.";
  if (body.privacyAccepted !== true) errors.privacyAccepted = "Confirme que leu a política de privacidade.";
  if (body.imageConsent !== undefined && typeof body.imageConsent !== "boolean") errors.imageConsent = "Resposta inválida.";

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      response,
      participationMode: response === "confirmed" ? participationMode : null,
      outfitSize: response === "confirmed" ? outfitSize : null,
      shirtSize: response === "confirmed" ? outfitSize : null,
      trainingOutfitSize: response === "confirmed" ? outfitSize : null,
      adultCompanionType: response === "confirmed" ? adultCompanionType : null,
      companionCount: response === "confirmed" ? companionCount : 0,
      childCount: response === "confirmed" ? childCount : 0,
      childKitSize: response === "confirmed" && childCount === 1 ? childKitSize : null,
      childAge: response === "confirmed" && childCount === 1 ? childAge : null,
      transportInterest: response === "confirmed" ? transportInterest : false,
      privacyAccepted: true,
      privacyVersion: MOVEMENT_PRIVACY_VERSION,
      imageConsent: body.imageConsent === true,
    },
  };
}

export function publicInvite(row) {
  return {
    inviteId: row.id,
    displayName: row.display_name || "Convidada",
    audienceType: row.audience_type,
    status: row.status,
    expiresAt: row.expires_at,
  };
}
