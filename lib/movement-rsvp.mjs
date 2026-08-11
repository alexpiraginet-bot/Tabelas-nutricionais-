import crypto from "node:crypto";

export const SHIRT_SIZES = Object.freeze(["PP", "P", "M", "G", "GG", "XGG"]);
export const TRAINING_OUTFIT_SIZES = SHIRT_SIZES;
export const ADULT_COMPANION_TYPES = Object.freeze(["husband", "mother"]);
export const PARTICIPATION_MODES = Object.freeze(["training", "lounge", "family"]);
export const MOVEMENT_PRIVACY_VERSION = "2026-08-11";

function cleanText(value, maxLength) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, maxLength);
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

export function validateRsvpPayload(input) {
  const body = input && typeof input === "object" ? input : {};
  const errors = {};
  const response = body.response === "confirmed" || body.response === "declined" ? body.response : null;
  const shirtSize = typeof body.shirtSize === "string" ? body.shirtSize.trim().toUpperCase() : "";
  const trainingOutfitSize = typeof body.trainingOutfitSize === "string" ? body.trainingOutfitSize.trim().toUpperCase() : "";
  const participationMode = PARTICIPATION_MODES.includes(body.participationMode) ? body.participationMode : null;
  const adultCompanionRaw = cleanText(body.adultCompanionType, 24);
  const adultCompanionType = ADULT_COMPANION_TYPES.includes(adultCompanionRaw) ? adultCompanionRaw : null;
  const companionCount = Number.isInteger(Number(body.companionCount)) ? Number(body.companionCount) : 0;
  const childCount = Number.isInteger(Number(body.childCount)) ? Number(body.childCount) : 0;
  const childKitSize = cleanText(body.childKitSize, 40);
  const expectedCompanionCount = (adultCompanionType ? 1 : 0) + childCount;

  if (body.siteUrl) errors.siteUrl = "Envio inválido.";
  if (!response) errors.response = "Escolha uma resposta.";
  if (response === "confirmed" && !participationMode) errors.participationMode = "Escolha como deseja participar.";
  if (response === "confirmed" && !SHIRT_SIZES.includes(shirtSize)) errors.shirtSize = "Escolha o tamanho da camiseta.";
  if (response === "confirmed" && !TRAINING_OUTFIT_SIZES.includes(trainingOutfitSize)) errors.trainingOutfitSize = "Escolha o tamanho da roupa de treino.";
  if (response === "confirmed" && adultCompanionRaw && !adultCompanionType) errors.adultCompanionType = "Escolha marido ou mãe como acompanhante adulto.";
  if (response === "confirmed" && (companionCount < 0 || companionCount > 2 || companionCount !== expectedCompanionCount)) errors.companionCount = "O convite permite até dois acompanhantes: marido ou mãe e uma criança.";
  if (response === "confirmed" && (childCount < 0 || childCount > 1)) errors.childCount = "O convite permite uma criança.";
  if (response === "confirmed" && participationMode === "family" && childCount !== 1) errors.childCount = "Informe uma criança para a opção família.";
  if (response === "confirmed" && participationMode !== "family" && childCount > 0) errors.childCount = "Escolha a oficina infantil para incluir crianças.";
  if (response === "confirmed" && childCount === 1 && !childKitSize) errors.childKitSize = "Informe um tamanho aproximado para a criança.";
  if (body.privacyAccepted !== true) errors.privacyAccepted = "Confirme que leu a política de privacidade.";
  if (body.imageConsent !== undefined && typeof body.imageConsent !== "boolean") errors.imageConsent = "Resposta inválida.";

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      response,
      participationMode: response === "confirmed" ? participationMode : null,
      shirtSize: response === "confirmed" ? shirtSize : null,
      trainingOutfitSize: response === "confirmed" ? trainingOutfitSize : null,
      adultCompanionType: response === "confirmed" ? adultCompanionType : null,
      companionCount: response === "confirmed" ? companionCount : 0,
      childCount: response === "confirmed" ? childCount : 0,
      childKitSize: response === "confirmed" && childCount === 1 ? childKitSize : null,
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
