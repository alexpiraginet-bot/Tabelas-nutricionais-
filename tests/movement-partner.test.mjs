import test from "node:test";
import assert from "node:assert/strict";
import {
  LEGACY_PARTNER_TIER_OPTIONS,
  PARTNER_TIER_OPTIONS,
  validatePartnerLead,
} from "../lib/movement-partner.mjs";
import { readFile } from "node:fs/promises";

test("partner lead exposes exactly four approved public participation options", () => {
  assert.deepEqual(PARTNER_TIER_OPTIONS, ["select", "experience", "signature", "founding_circle"]);
  assert.deepEqual(LEGACY_PARTNER_TIER_OPTIONS, ["founding", "experience", "kit", "mobility", "support", "custom"]);
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
    tier: "founding_circle",
    contributionType: "product",
    contributionDetails: "  Produtos para a oficina infantil.  ",
    privacyAccepted: true,
  });
  assert.equal(valid.ok, true);
  assert.equal(valid.value.companyName, "Gran Cave");
  assert.equal(valid.value.email, "marketing@example.com");
  assert.equal(valid.value.tier, "founding_circle");
  assert.equal(valid.value.isBinding, false);
});

test("partner lead rejects legacy-only values at the public validator", () => {
  for (const tier of LEGACY_PARTNER_TIER_OPTIONS.filter((value) => !PARTNER_TIER_OPTIONS.includes(value))) {
    const invalid = validatePartnerLead({
      companyName: "Marca de mobilidade premium",
      contactName: "Pessoa Responsável",
      email: "marketing@example.com",
      tier,
      contributionType: "service",
      contributionDetails: "Experiência de chegada com veículo premium.",
      privacyAccepted: true,
    });
    assert.equal(invalid.ok, false, tier);
    assert.ok(invalid.errors.tier, tier);
  }

  const valid = validatePartnerLead({
    companyName: "Marca fundadora",
    contactName: "Pessoa Responsável",
    email: "marketing@example.com",
    tier: "founding_circle",
    contributionType: "service",
    contributionDetails: "Participação editorial no aniversário.",
    privacyAccepted: true,
  });
  assert.equal(valid.ok, true);
  assert.equal(valid.value.tier, "founding_circle");
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

test("public partner surface keeps legacy tiers out of the curated participation choices", async () => {
  const flow = await readFile(new URL("../src/movimento/PartnerInterestFlow.jsx", import.meta.url), "utf8");

  assert.match(flow, /const PARTICIPATIONS = \[/);
  assert.match(flow, /value: "select", label: "Select"/);
  assert.match(flow, /value: "experience", label: "Experience"/);
  assert.match(flow, /value: "signature", label: "Signature"/);
  assert.match(flow, /value: "founding_circle", label: "Founding Circle"/);
  assert.doesNotMatch(flow, /value: "(?:kit|mobility|support|custom|founding)"/);
  assert.doesNotMatch(flow, /Cota (?:Fundadora|Experiência|Kit|Mobilidade Premium|Apoio|Sob Medida)/);
});
