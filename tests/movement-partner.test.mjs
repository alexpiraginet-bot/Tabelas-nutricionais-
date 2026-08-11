import test from "node:test";
import assert from "node:assert/strict";
import { PARTNER_TIER_OPTIONS, validatePartnerLead } from "../lib/movement-partner.mjs";

test("partner lead exposes only the approved quota-interest options", () => {
  assert.deepEqual(PARTNER_TIER_OPTIONS, ["founding", "experience", "kit", "mobility", "support", "custom"]);
});

test("partner lead requires identity, contact, quota interest and privacy acknowledgement", () => {
  const invalid = validatePartnerLead({});
  assert.equal(invalid.ok, false);
  assert.ok(invalid.errors.companyName);
  assert.ok(invalid.errors.contactName);
  assert.ok(invalid.errors.email);
  assert.ok(invalid.errors.tier);
  assert.ok(invalid.errors.privacyAccepted);
});

test("partner lead normalizes fields and keeps quota selection non-binding", () => {
  const valid = validatePartnerLead({
    companyName: "  Gran Cave  ",
    contactName: "  Pessoa Responsável  ",
    email: "MARKETING@EXAMPLE.COM ",
    phone: " (27) 99999-0000 ",
    tier: "experience",
    contributionType: "product",
    contributionDetails: "  Produtos para a oficina infantil.  ",
    privacyAccepted: true,
  });
  assert.equal(valid.ok, true);
  assert.equal(valid.value.companyName, "Gran Cave");
  assert.equal(valid.value.email, "marketing@example.com");
  assert.equal(valid.value.tier, "experience");
  assert.equal(valid.value.isBinding, false);
});

test("partner lead accepts the premium mobility quota as non-binding interest", () => {
  const valid = validatePartnerLead({
    companyName: "Marca de mobilidade premium",
    contactName: "Pessoa Responsável",
    email: "marketing@example.com",
    tier: "mobility",
    contributionType: "service",
    contributionDetails: "Experiência de chegada com veículo premium.",
    privacyAccepted: true,
  });
  assert.equal(valid.ok, true);
  assert.equal(valid.value.tier, "mobility");
  assert.equal(valid.value.isBinding, false);
});

test("partner lead rejects unsupported tiers, oversized content and honeypot submissions", () => {
  const invalid = validatePartnerLead({
    companyName: "Marca",
    contactName: "Responsável",
    email: "marketing@example.com",
    tier: "diamond",
    contributionDetails: "x".repeat(1201),
    privacyAccepted: true,
    siteUrl: "https://spam.example",
  });
  assert.equal(invalid.ok, false);
  assert.ok(invalid.errors.tier);
  assert.ok(invalid.errors.contributionDetails);
  assert.ok(invalid.errors.siteUrl);
});
