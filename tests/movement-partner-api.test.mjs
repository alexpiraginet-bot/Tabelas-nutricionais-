import test from "node:test";
import assert from "node:assert/strict";
import { createPartnerLeadHandler } from "../api/movimento-parceiros.js";

const ENV = { SUPABASE_URL: "https://project.supabase.co/rest/v1", SUPABASE_SERVICE_ROLE_KEY: "test-service-key" };

function req(method, body = {}, headers = {}) {
  return { method, body, headers: { origin: "https://bentogelateria.com", ...headers } };
}

function res() {
  return {
    statusCode: 200, headers: {}, payload: undefined,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.payload = value; return this; },
    end() { return this; },
  };
}

test("partner lead API accepts POST only", async () => {
  const out = res();
  await createPartnerLeadHandler({ fetchImpl: async () => ({ ok: true, status: 200, json: async () => [] }), env: ENV })(req("GET"), out);
  assert.equal(out.statusCode, 405);
});

test("partner lead API persists one normalized quota interest without returning private contact data", async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    return { ok: true, status: 201, json: async () => [{ id: "4c2a980d-e4a2-4591-bb74-b0bcc8372ff8" }] };
  };
  const out = res();
  await createPartnerLeadHandler({ fetchImpl, env: ENV, now: () => new Date("2026-08-11T16:00:00.000Z") })(req("POST", {
    companyName: "Marca Parceira",
    contactName: "Pessoa Responsável",
    email: "marketing@example.com",
    tier: "founding",
    contributionType: "mixed",
    contributionDetails: "Produto, serviço e investimento.",
    privacyAccepted: true,
  }), out);
  assert.equal(out.statusCode, 200);
  assert.equal(out.payload.ok, true);
  assert.equal("email" in out.payload, false);
  const persisted = JSON.parse(calls[0].options.body);
  assert.equal(persisted.tier_interest, "founding");
  assert.equal(persisted.is_binding, false);
  assert.match(persisted.lead_key, /^[a-f0-9]{64}$/);
  assert.match(calls[0].url, /^https:\/\/project\.supabase\.co\/rest\/v1\/movement_partner_leads\?/);
  assert.doesNotMatch(calls[0].url, /\/rest\/v1\/rest\/v1\//);
  assert.match(calls[0].url, /on_conflict=lead_key/);
});

test("partner lead API rejects foreign origins and missing server configuration", async () => {
  const foreign = res();
  await createPartnerLeadHandler({ env: ENV })(req("POST", {}, { origin: "https://attacker.example" }), foreign);
  assert.equal(foreign.statusCode, 403);

  const missing = res();
  await createPartnerLeadHandler({ env: {} })(req("POST"), missing);
  assert.equal(missing.statusCode, 503);
});
