import test from "node:test";
import assert from "node:assert/strict";
import {
  ADULT_COMPANION_TYPES,
  SHIRT_SIZES,
  PARTICIPATION_MODES,
  hashInviteToken,
  publicInvite,
  validateRsvpPayload,
  validateToken,
} from "../lib/movement-rsvp.mjs";

test("movement RSVP accepts only opaque invitation tokens", () => {
  assert.equal(validateToken("short").ok, false);
  assert.equal(validateToken("a".repeat(32)).ok, true);
  assert.equal(validateToken("a".repeat(31) + "!").ok, false);
});

test("movement RSVP hashes the same token deterministically without returning it", () => {
  const token = "invite_abcdefghijklmnopqrstuvwxyz_2026";
  const first = hashInviteToken(token);
  assert.equal(first, hashInviteToken(token));
  assert.equal(first.length, 64);
  assert.equal(first.includes(token), false);
});

test("movement RSVP requires shirt and training outfit sizes only for the invited influencer", () => {
  const missing = validateRsvpPayload({ response: "confirmed", participationMode: "training", privacyAccepted: true, imageConsent: false });
  assert.equal(missing.ok, false);
  assert.deepEqual(SHIRT_SIZES, ["PP", "P", "M", "G", "GG", "XGG"]);

  const confirmed = validateRsvpPayload({ response: "confirmed", participationMode: "training", shirtSize: "m", trainingOutfitSize: "g", privacyAccepted: true, imageConsent: false });
  assert.equal(confirmed.ok, true);
  assert.equal(confirmed.value.shirtSize, "M");
  assert.equal(confirmed.value.trainingOutfitSize, "G");

  const declined = validateRsvpPayload({ response: "declined", shirtSize: "XGG", trainingOutfitSize: "PP", privacyAccepted: true, imageConsent: false });
  assert.equal(declined.ok, true);
  assert.equal(declined.value.shirtSize, null);
  assert.equal(declined.value.trainingOutfitSize, null);
});

test("movement RSVP limits the invitation to the influencer plus husband or mother and one child", () => {
  assert.deepEqual(PARTICIPATION_MODES, ["training", "lounge", "family"]);
  assert.deepEqual(ADULT_COMPANION_TYPES, ["husband", "mother"]);
  const family = validateRsvpPayload({
    response: "confirmed", participationMode: "family", shirtSize: "G", trainingOutfitSize: "M",
    adultCompanionType: "mother", companionCount: 2, childCount: 1, childKitSize: "6 infantil",
    privacyAccepted: true, imageConsent: false,
  });
  assert.equal(family.ok, true);
  assert.equal(family.value.participationMode, "family");
  assert.equal(family.value.companionCount, 2);
  assert.equal(family.value.childCount, 1);
  assert.equal(family.value.adultCompanionType, "mother");
  assert.equal(family.value.childKitSize, "6 infantil");
  assert.equal("childName" in family.value, false);

  const tooMany = validateRsvpPayload({
    response: "confirmed", participationMode: "family", shirtSize: "G", trainingOutfitSize: "G",
    adultCompanionType: "husband", companionCount: 3, childCount: 2, childKitSize: "8 infantil",
    privacyAccepted: true, imageConsent: false,
  });
  assert.equal(tooMany.ok, false);

  const bothAdults = validateRsvpPayload({
    response: "confirmed", participationMode: "lounge", shirtSize: "G", trainingOutfitSize: "G",
    adultCompanionType: "husband,mother", companionCount: 2, childCount: 0,
    privacyAccepted: true, imageConsent: false,
  });
  assert.equal(bothAdults.ok, false);
});

test("movement RSVP asks only an approximate child kit size and does not promise the kit", () => {
  const missingSize = validateRsvpPayload({
    response: "confirmed", participationMode: "family", shirtSize: "P", trainingOutfitSize: "P",
    companionCount: 1, childCount: 1, childKitSize: "", privacyAccepted: true, imageConsent: false,
  });
  assert.equal(missingSize.ok, false);
  assert.equal(missingSize.errors.childKitSize, "Informe um tamanho aproximado para a criança.");

  const anyAge = validateRsvpPayload({
    response: "confirmed", participationMode: "family", shirtSize: "P", trainingOutfitSize: "P",
    companionCount: 1, childCount: 1, childKitSize: "12 meses", privacyAccepted: true, imageConsent: false,
  });
  assert.equal(anyAge.ok, true);
  assert.equal(anyAge.value.childKitSize, "12 meses");
});

test("movement RSVP keeps image consent optional and separate from privacy acknowledgement", () => {
  const noPrivacy = validateRsvpPayload({ response: "declined", privacyAccepted: false, imageConsent: true });
  assert.equal(noPrivacy.ok, false);

  const noImage = validateRsvpPayload({ response: "declined", privacyAccepted: true, imageConsent: false });
  assert.equal(noImage.ok, true);
  assert.equal(noImage.value.imageConsent, false);
});

test("movement RSVP rejects the honeypot and strips private invite fields", () => {
  assert.equal(validateRsvpPayload({ response: "declined", privacyAccepted: true, siteUrl: "spam" }).ok, false);

  const invite = publicInvite({
    id: "84ccf9b6-b170-4212-9f3d-1ce53901ca18",
    display_name: "Convidada",
    audience_type: "influencer",
    status: "sent",
    expires_at: "2026-09-01T12:00:00.000Z",
    contact: "private@example.com",
    token_hash: "secret-hash",
  });
  assert.deepEqual(invite, {
    inviteId: "84ccf9b6-b170-4212-9f3d-1ce53901ca18",
    displayName: "Convidada",
    audienceType: "influencer",
    status: "sent",
    expiresAt: "2026-09-01T12:00:00.000Z",
  });
  assert.equal("contact" in invite, false);
  assert.equal("tokenHash" in invite, false);
});
