import test from "node:test";
import assert from "node:assert/strict";
import { createPartnerLeadHandler } from "../api/movimento-parceiros.js";

const ENV = { SUPABASE_URL: "https://project.supabase.co/rest/v1", SUPABASE_SERVICE_ROLE_KEY: "test-service-key" };
const SECRET_ENV = { SUPABASE_URL: "https://project.supabase.co/rest/v1", SUPABASE_SERVICE_KEY: "sb_secret_test_key" };
const VALID_TOKEN = "invite_abcdefghijklmnopqrstuvwxyz_2026";
const PARTNER_INVITE = { id: "fa4ce3a4-bdb7-4612-b9d8-4959099d2684", display_name: "Marca Parceira", recipient_name: "Bia", company_name: "Marca Parceira", audience_type: "partner", status: "sent", opened_at: null, expires_at: "2026-09-01T12:00:00.000Z" };

function response(data, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => data };
}

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
    tier: "founding_circle",
    contributionType: "mixed",
    contributionDetails: "Produto, serviço e investimento.",
    privacyAccepted: true,
  }), out);
  assert.equal(out.statusCode, 200);
  assert.equal(out.payload.ok, true);
  assert.equal("email" in out.payload, false);
  const persisted = JSON.parse(calls[0].options.body);
  assert.equal(persisted.tier_interest, "founding_circle");
  assert.equal(persisted.is_binding, false);
  assert.match(persisted.lead_key, /^[a-f0-9]{64}$/);
  assert.match(calls[0].url, /^https:\/\/project\.supabase\.co\/rest\/v1\/movement_partner_leads\?/);
  assert.doesNotMatch(calls[0].url, /\/rest\/v1\/rest\/v1\//);
  assert.match(calls[0].url, /on_conflict=lead_key/);
});

test("partner lead API sends a modern Supabase secret only as apikey", async () => {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, options });
    return response([{ id: "4c2a980d-e4a2-4591-bb74-b0bcc8372ff8" }], 201);
  };
  const out = res();

  await createPartnerLeadHandler({ fetchImpl, env: SECRET_ENV, now: () => new Date("2026-08-11T16:00:00.000Z") })(req("POST", {
    companyName: "Marca Parceira",
    contactName: "Pessoa Responsável",
    email: "marketing@example.com",
    tier: "select",
    contributionType: "service",
    privacyAccepted: true,
  }), out);

  assert.equal(out.statusCode, 200);
  assert.equal(calls[0].options.headers.apikey, "sb_secret_test_key");
  assert.equal("Authorization" in calls[0].options.headers, false);
});

test("partner lead API associates a personal partner response idempotently by invite id", async () => {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, options });
    if (url.includes("movement_invites") && options.method !== "PATCH") return { ok: true, status: 200, json: async () => [PARTNER_INVITE] };
    if (url.includes("movement_partner_leads")) return { ok: true, status: 201, json: async () => [{ id: "4c2a980d-e4a2-4591-bb74-b0bcc8372ff8" }] };
    return { ok: true, status: 200, json: async () => [{ id: PARTNER_INVITE.id }] };
  };
  const out = res();
  await createPartnerLeadHandler({ fetchImpl, env: ENV, now: () => new Date("2026-08-11T16:00:00.000Z") })(req("POST", {
    token: VALID_TOKEN,
    companyName: "X",
    contactName: "",
    email: "bia@marca.com",
    tier: "signature",
    contributionType: "service",
    privacyAccepted: true,
  }), out);

  assert.equal(out.statusCode, 200);
  const upsert = calls.find((call) => call.url.includes("movement_partner_leads"));
  assert.match(upsert.url, /on_conflict=invite_id/);
  const persisted = JSON.parse(upsert.options.body);
  assert.equal(persisted.invite_id, PARTNER_INVITE.id);
  assert.equal(persisted.company_name, PARTNER_INVITE.company_name);
  assert.equal(persisted.contact_name, PARTNER_INVITE.recipient_name);
  const opening = calls.find((call) => call.url.includes("opened_at=is.null"));
  assert.ok(opening);
  const responded = calls.find((call) => call.url.includes("movement_invites") && call.options.method === "PATCH" && !call.url.includes("opened_at=is.null"));
  assert.match(responded.url, /status=in\.\(sent,opened,responded\)&revoked_at=is\.null$/);
  assert.deepEqual(JSON.parse(responded.options.body), { status: "responded", updated_at: "2026-08-11T16:00:00.000Z" });
  assert.equal(responded.options.headers.Prefer, "return=representation");
  assert.ok(calls.indexOf(responded) < calls.indexOf(upsert));
});

test("partner lead API aborts before persistence when the responded claim affects zero rows", async () => {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, options });
    if (url.includes("movement_invites") && options.method === "PATCH" && url.includes("opened_at=is.null")) return response([{ id: PARTNER_INVITE.id }]);
    if (url.includes("movement_invites") && options.method === "PATCH") return response([]);
    if (url.includes("movement_invites")) return response([PARTNER_INVITE]);
    return response([{ id: "must-not-persist" }], 201);
  };
  const out = res();
  await createPartnerLeadHandler({ fetchImpl, env: ENV, now: () => new Date("2026-08-11T16:00:00.000Z") })(req("POST", {
    token: VALID_TOKEN, companyName: "Body", contactName: "Body", email: "bia@marca.com", tier: "select", contributionType: "service", privacyAccepted: true,
  }), out);
  assert.equal(out.statusCode, 409);
  assert.deepEqual(out.payload, { ok: false, error: "Não foi possível registrar este convite." });
  assert.equal(calls.some((call) => call.url.includes("movement_partner_leads") && call.options.method === "POST"), false);
});

test("partner lead API returns the same neutral conflict for inactive, missing, wrong-audience, and associated invitations", async () => {
  const message = "Não foi possível registrar este convite.";
  for (const rows of [
    [],
    [{ ...PARTNER_INVITE, status: "revoked" }],
    [{ ...PARTNER_INVITE, expires_at: "2026-08-01T12:00:00.000Z" }],
    [{ ...PARTNER_INVITE, audience_type: "influencer" }],
  ]) {
    const calls = [];
    const mismatch = res();
    await createPartnerLeadHandler({
      fetchImpl: async (url, options) => {
        calls.push({ url, options });
        return { ok: true, status: 200, json: async () => rows };
      },
      env: ENV,
      now: () => new Date("2026-08-11T16:00:00.000Z"),
    })(req("POST", {
      token: VALID_TOKEN, companyName: "Marca", contactName: "Bia", email: "bia@marca.com", tier: "select", contributionType: "service", privacyAccepted: true,
    }), mismatch);
    assert.equal(mismatch.statusCode, 409);
    assert.deepEqual(mismatch.payload, { ok: false, error: message });
    assert.equal(calls.some((call) => call.options?.method === "PATCH"), false);
  }

  const conflict = res();
  await createPartnerLeadHandler({
    fetchImpl: async (url, options = {}) => {
      if (url.includes("movement_invites") && options.method !== "PATCH") return { ok: true, status: 200, json: async () => [PARTNER_INVITE] };
      if (url.includes("movement_partner_leads")) return { ok: false, status: 409, json: async () => ({ code: "23505" }) };
      return { ok: true, status: 204, json: async () => [] };
    },
    env: ENV,
    now: () => new Date("2026-08-11T16:00:00.000Z"),
  })(req("POST", {
    token: VALID_TOKEN, companyName: "Marca", contactName: "Bia", email: "bia@marca.com", tier: "select", contributionType: "service", privacyAccepted: true,
  }), conflict);
  assert.equal(conflict.statusCode, 409);
  assert.deepEqual(conflict.payload, { ok: false, error: message });
});

test("partner lead API rejects parsed bodies above 32 KiB before validation", async () => {
  let called = false;
  const out = res();
  await createPartnerLeadHandler({ fetchImpl: async () => { called = true; return { ok: true, status: 200, json: async () => [] }; }, env: ENV })(req("POST", JSON.stringify({
    companyName: "Marca",
    note: "x".repeat(33 * 1024),
  })), out);
  assert.equal(out.statusCode, 413);
  assert.equal(called, false);
});

test("partner lead API rejects foreign origins and missing server configuration", async () => {
  const foreign = res();
  await createPartnerLeadHandler({ env: ENV })(req("POST", {}, { origin: "https://attacker.example" }), foreign);
  assert.equal(foreign.statusCode, 403);

  const missing = res();
  await createPartnerLeadHandler({ env: {} })(req("POST"), missing);
  assert.equal(missing.statusCode, 503);
});
