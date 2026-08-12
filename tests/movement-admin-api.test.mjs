import test from "node:test";
import assert from "node:assert/strict";
import { createMovementAdminHandler } from "../api/movimento-admin.js";

const ENV = {
  PANEL_KEY: "panel-test-key",
  SUPABASE_URL: "https://project.supabase.co/rest/v1",
  SUPABASE_SERVICE_ROLE_KEY: "test-service-key",
};
const SECRET_ENV = {
  PANEL_KEY: "panel-test-key",
  SUPABASE_URL: "https://project.supabase.co/rest/v1",
  SUPABASE_SERVICE_KEY: "sb_secret_test_key",
};

function response(data, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => data };
}

function req(method = "GET", token = "panel-test-key", body = null) {
  return { method, body, headers: token ? { authorization: `Bearer ${token}` } : {} };
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

test("movement admin API requires the existing panel key before reading Supabase", async () => {
  let called = false;
  for (const token of ["", "wrong-key"]) {
    const out = res();
    await createMovementAdminHandler({ fetchImpl: async () => { called = true; return response([]); }, env: ENV })(req("GET", token), out);
    assert.equal(out.statusCode, 401);
    assert.deepEqual(out.payload, { ok: false, error: "Não autorizado." });
  }
  assert.equal(called, false);
});

test("movement admin API reports missing server configuration", async () => {
  const out = res();
  await createMovementAdminHandler({ fetchImpl: async () => response([]), env: { PANEL_KEY: "panel-test-key" } })(req(), out);
  assert.equal(out.statusCode, 503);
  assert.deepEqual(out.payload, { ok: false, error: "Movimento temporariamente indisponível." });
});

test("movement admin API summarizes both invitation audiences without exposing hashes or encrypted tokens", async () => {
  const calls = [];
  const inviteId = "84ccf9b6-b170-4212-9f3d-1ce53901ca18";
  const partnerInviteId = "fa4ce3a4-bdb7-4612-b9d8-4959099d2684";
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    if (url.includes("movement_invites")) return response([
      { id: inviteId, display_name: "Ana", recipient_name: "Ana", company_name: null, contact: "ana@example.com", audience_type: "influencer", status: "responded", opened_at: "2026-08-11T12:30:00.000Z", revoked_at: null, expires_at: "2026-09-01T12:00:00.000Z", created_at: "2026-08-11T12:00:00.000Z" },
      { id: partnerInviteId, display_name: "Marca", recipient_name: "Bia", company_name: "Marca", contact: "bia@marca.com", audience_type: "partner", status: "sent", opened_at: null, revoked_at: null, expires_at: "2026-09-01T12:00:00.000Z", created_at: "2026-08-11T12:05:00.000Z" },
    ]);
    if (url.includes("movement_rsvps")) return response([{ invite_id: inviteId, response: "confirmed", participation_mode: "family", shirt_size: "M", training_outfit_size: "G", adult_companion_type: "mother", companion_count: 2, child_count: 1, child_age: 7, child_kit_size: "6 infantil", transport_interest: true, image_consent: false, responded_at: "2026-08-11T13:00:00.000Z", updated_at: "2026-08-11T13:00:00.000Z" }]);
    return response([{ id: "c0a8012e-b173-4ab3-b9c9-e4a6c33258f8", invite_id: partnerInviteId, company_name: "Marca", contact_name: "Bia", email: "bia@marca.com", phone: "27999999999", tier_interest: "founding", contribution_type: "mixed", contribution_details: "Produto e experiência", submitted_at: "2026-08-11T14:00:00.000Z", updated_at: "2026-08-11T14:00:00.000Z" }]);
  };

  const out = res();
  await createMovementAdminHandler({ fetchImpl, env: ENV })(req(), out);

  assert.equal(out.statusCode, 200);
  assert.deepEqual(out.payload.summary, { invited: 2, confirmed: 1, declined: 0, pending: 0, partnerLeads: 1 });
  assert.equal(out.payload.invites[0].rsvp.trainingOutfitSize, "G");
  assert.equal(out.payload.invites[0].rsvp.adultCompanionType, "mother");
  assert.equal(out.payload.invites[0].rsvp.childAge, 7);
  assert.equal(out.payload.invites[0].rsvp.childKitSize, "6 infantil");
  assert.equal(out.payload.invites[0].rsvp.transportInterest, true);
  assert.equal(out.payload.invites[1].audienceType, "partner");
  assert.equal(out.payload.invites[1].recipientName, "Bia");
  assert.equal(out.payload.invites[1].companyName, "Marca");
  assert.equal(out.payload.invites[1].partnerLead.id, "c0a8012e-b173-4ab3-b9c9-e4a6c33258f8");
  assert.equal(out.payload.partners[0].inviteId, partnerInviteId);
  assert.equal(out.payload.partners[0].tierInterest, "founding");
  assert.equal(JSON.stringify(out.payload).includes("token_hash"), false);
  assert.equal(JSON.stringify(out.payload).includes("resend_token_ciphertext"), false);
  assert.equal(calls.some((call) => call.url.includes("token_hash")), false);
  assert.equal(calls.find((call) => call.url.includes("movement_invites")).url.includes("audience_type=eq.influencer"), false);
  assert.equal(calls.every((call) => call.url.startsWith("https://project.supabase.co/rest/v1/")), true);
  assert.equal(calls.some((call) => call.url.includes("/rest/v1/rest/v1/")), false);
  assert.equal(calls.every((call) => call.options.headers.apikey === "test-service-key"), true);
});

test("movement admin API sends a modern Supabase secret only as apikey", async () => {
  const calls = [];
  const out = res();
  await createMovementAdminHandler({
    fetchImpl: async (url, options = {}) => {
      calls.push({ url, options });
      return response([]);
    },
    env: SECRET_ENV,
  })(req(), out);

  assert.equal(out.statusCode, 200);
  assert.equal(calls.length, 4);
  assert.equal(calls.every((call) => call.options.headers.apikey === "sb_secret_test_key"), true);
  assert.equal(calls.every((call) => !("Authorization" in call.options.headers)), true);
});

test("movement admin API excludes draft, revoked, and expired invitations from pending", async () => {
  const activeId = "84ccf9b6-b170-4212-9f3d-1ce53901ca18";
  const fetchImpl = async (url) => {
    if (url.includes("movement_invites")) return response([
      { id: activeId, display_name: "Ativo", audience_type: "influencer", status: "sent", expires_at: "2026-09-01T12:00:00.000Z" },
      { id: "10000000-0000-4000-8000-000000000000", display_name: "Aberto", audience_type: "influencer", status: "opened", expires_at: "2026-09-01T12:00:00.000Z" },
      { id: "10000000-0000-4000-8000-000000000001", display_name: "Draft", audience_type: "influencer", status: "draft", expires_at: "2026-09-01T12:00:00.000Z" },
      { id: "10000000-0000-4000-8000-000000000002", display_name: "Revogado", audience_type: "partner", status: "revoked", expires_at: "2026-09-01T12:00:00.000Z" },
      { id: "10000000-0000-4000-8000-000000000003", display_name: "Expirado", audience_type: "partner", status: "sent", expires_at: "2026-08-01T12:00:00.000Z" },
      { id: "10000000-0000-4000-8000-000000000004", display_name: "Respondido", audience_type: "partner", status: "responded", expires_at: "2026-09-01T12:00:00.000Z" },
    ]);
    return response([]);
  };
  const out = res();
  await createMovementAdminHandler({ fetchImpl, env: ENV, now: () => new Date("2026-08-11T12:00:00.000Z") })(req(), out);
  assert.equal(out.statusCode, 200);
  assert.equal(out.payload.summary.invited, 6);
  assert.equal(out.payload.summary.pending, 2);
});

test("movement admin API creates an influencer link and stores an encrypted reusable token", async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    return response([{ id: "84ccf9b6-b170-4212-9f3d-1ce53901ca18", display_name: "Ana", recipient_name: "Ana", company_name: null, audience_type: "influencer", contact: "ana@example.com", status: "sent", expires_at: "2026-12-31T23:59:00.000Z", created_at: "2026-08-11T12:00:00.000Z" }], 201);
  };
  const out = res();
  await createMovementAdminHandler({
    fetchImpl,
    env: ENV,
    createToken: () => "invite_abcdefghijklmnopqrstuvwxyz_2026",
    now: () => new Date("2026-08-11T12:00:00.000Z"),
  })(req("POST", "panel-test-key", {
    action: "create-invite",
    audienceType: "influencer",
    displayName: "  Ana  ",
    contact: "ana@example.com",
    expiresAt: "2026-12-31T23:59:00.000Z",
  }), out);

  assert.equal(out.statusCode, 201);
  assert.equal(out.payload.invitePath, "/movimento/convite/invite_abcdefghijklmnopqrstuvwxyz_2026");
  assert.equal(out.payload.invite.displayName, "Ana");
  assert.equal(out.payload.invite.audienceType, "influencer");
  assert.doesNotMatch(JSON.stringify(out.payload.invite), /invite_abcdefghijklmnopqrstuvwxyz_2026/);
  const persisted = JSON.parse(calls[0].options.body);
  assert.equal(persisted.token_hash, "91517880b4a2308ea3823e81e58aaea193b7d24ffa6ef98e859a247c16e9e145");
  assert.equal(JSON.stringify(persisted).includes("invite_abcdefghijklmnopqrstuvwxyz_2026"), false);
  assert.match(persisted.resend_token_ciphertext, /^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  assert.equal(persisted.audience_type, "influencer");
  assert.equal(persisted.display_name, "Ana");
  assert.equal(persisted.recipient_name, "Ana");
  assert.equal(persisted.company_name, null);
  assert.equal(persisted.status, "sent");
  assert.equal(calls[0].options.headers.Prefer, "return=representation");
});

test("movement admin API returns reusable paths for direct and aliased invitation tokens", async () => {
  const reusableId = "84ccf9b6-b170-4212-9f3d-1ce53901ca18";
  const legacyId = "fa4ce3a4-bdb7-4612-b9d8-4959099d2684";
  let persisted;
  const fetchImpl = async (url, options = {}) => {
    if (url.endsWith("/movement_invites") && options.method === "POST") {
      persisted = JSON.parse(options.body);
      return response([{ id: reusableId, display_name: "Ana", recipient_name: "Ana", company_name: null, audience_type: "influencer", contact: null, status: "sent", expires_at: "2026-12-31T23:59:00.000Z", created_at: "2026-08-12T12:00:00.000Z" }], 201);
    }
    if (url.includes("movement_invite_aliases")) return response([
      { invite_id: legacyId, resend_token_ciphertext: persisted.resend_token_ciphertext },
    ]);
    if (url.includes("movement_invites")) return response([
      { id: reusableId, display_name: "Ana", recipient_name: "Ana", company_name: null, contact: null, audience_type: "influencer", status: "sent", opened_at: null, revoked_at: null, expires_at: "2026-12-31T23:59:00.000Z", created_at: "2026-08-12T12:00:00.000Z", resend_token_ciphertext: persisted.resend_token_ciphertext },
      { id: legacyId, display_name: "Marca", recipient_name: "Bia", company_name: "Marca", contact: null, audience_type: "partner", status: "sent", opened_at: null, revoked_at: null, expires_at: "2026-12-31T23:59:00.000Z", created_at: "2026-08-11T12:00:00.000Z", resend_token_ciphertext: null },
    ]);
    return response([]);
  };
  const handler = createMovementAdminHandler({
    fetchImpl,
    env: ENV,
    createToken: () => "invite_abcdefghijklmnopqrstuvwxyz_2026",
    now: () => new Date("2026-08-12T12:00:00.000Z"),
  });

  const created = res();
  await handler(req("POST", "panel-test-key", {
    action: "create-invite",
    audienceType: "influencer",
    displayName: "Ana",
    expiresAt: "2026-12-31T23:59:00.000Z",
  }), created);
  const listed = res();
  await handler(req("GET"), listed);

  assert.equal(created.statusCode, 201);
  assert.equal(listed.statusCode, 200);
  assert.equal(listed.payload.invites[0].invitePath, "/movimento/convite/invite_abcdefghijklmnopqrstuvwxyz_2026");
  assert.equal(listed.payload.invites[1].invitePath, "/movimento/convite/invite_abcdefghijklmnopqrstuvwxyz_2026");
  assert.equal(JSON.stringify(listed.payload).includes("resend_token_ciphertext"), false);
});

test("movement admin API automatically gives active legacy invitations a reusable alias", async () => {
  const inviteId = "fa4ce3a4-bdb7-4612-b9d8-4959099d2684";
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, options });
    if (url.includes("movement_invite_aliases") && options.method === "POST") {
      return response([{ ...JSON.parse(options.body) }], 201);
    }
    if (url.includes("movement_invite_aliases")) return response([]);
    if (url.includes("movement_invites")) return response([
      { id: inviteId, display_name: "Marca", recipient_name: "Bia", company_name: "Marca", contact: null, audience_type: "partner", status: "sent", opened_at: null, revoked_at: null, expires_at: "2026-12-31T23:59:00.000Z", created_at: "2026-08-11T12:00:00.000Z", resend_token_ciphertext: null },
    ]);
    return response([]);
  };
  const out = res();
  await createMovementAdminHandler({
    fetchImpl,
    env: ENV,
    createLegacyToken: () => "invite_legacy_abcdefghijklmnopqrstuvwxyz",
    now: () => new Date("2026-08-12T12:00:00.000Z"),
  })(req(), out);

  assert.equal(out.statusCode, 200);
  assert.equal(out.payload.invites[0].invitePath, "/movimento/convite/invite_legacy_abcdefghijklmnopqrstuvwxyz");
  const aliasWrite = calls.find((call) => call.url.includes("movement_invite_aliases?on_conflict=invite_id") && call.options.method === "POST");
  assert.ok(aliasWrite);
  assert.equal(JSON.parse(aliasWrite.options.body).invite_id, inviteId);
  assert.equal(calls.some((call) => call.url.includes("movement_invites") && call.options.method === "PATCH"), false);
});

test("movement admin API creates a resend alias without invalidating the original invitation token", async () => {
  const inviteId = "84ccf9b6-b170-4212-9f3d-1ce53901ca18";
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, options });
    if (url.includes("/movement_invite_aliases?on_conflict=invite_id")) return response([{ invite_id: inviteId }], 201);
    return response([{ id: inviteId, display_name: "Ana", status: "opened", expires_at: "2026-12-31T23:59:00.000Z" }]);
  };
  const out = res();
  await createMovementAdminHandler({
    fetchImpl,
    env: ENV,
    createToken: () => "invite_reissued_abcdefghijklmnopqrstuvwxyz",
    now: () => new Date("2026-08-12T12:00:00.000Z"),
  })(req("POST", "panel-test-key", { action: "reissue-invite", inviteId }), out);

  assert.equal(out.statusCode, 200);
  assert.equal(out.payload.invitePath, "/movimento/convite/invite_reissued_abcdefghijklmnopqrstuvwxyz");
  assert.equal(out.payload.invite.id, inviteId);
  const aliasWrite = calls.find((call) => call.url.includes("/movement_invite_aliases?on_conflict=invite_id"));
  const persisted = JSON.parse(aliasWrite.options.body);
  assert.equal(persisted.token_hash.length, 64);
  assert.match(persisted.resend_token_ciphertext, /^v1\./);
  assert.equal(persisted.invite_id, inviteId);
  assert.equal(JSON.stringify(persisted).includes("invite_reissued_abcdefghijklmnopqrstuvwxyz"), false);
  const activeRead = calls.find((call) => call.url.includes("movement_invites?id=eq."));
  assert.match(activeRead.url, /status=in\.\(sent,opened,responded\)/);
  assert.match(activeRead.url, /revoked_at=is\.null/);
  assert.match(activeRead.url, /expires_at=gt\./);
  assert.equal(calls.some((call) => call.url.includes("movement_invites") && call.options.method === "PATCH"), false);
  assert.match(aliasWrite.url, /on_conflict=invite_id/);
});

test("movement admin API reads the winning legacy alias after a concurrent creation", async () => {
  const inviteId = "fa4ce3a4-bdb7-4612-b9d8-4959099d2684";
  let winningCiphertext = "";
  const bootstrap = createMovementAdminHandler({
    fetchImpl: async (_url, options = {}) => {
      winningCiphertext = JSON.parse(options.body).resend_token_ciphertext;
      return response([{ id: inviteId, display_name: "Marca", recipient_name: "Bia", company_name: "Marca", audience_type: "partner", status: "sent", expires_at: "2026-12-31T23:59:00.000Z", created_at: "2026-08-11T12:00:00.000Z" }], 201);
    },
    env: ENV,
    createToken: () => "invite_winning_abcdefghijklmnopqrstuvwxyz",
    now: () => new Date("2026-08-12T12:00:00.000Z"),
  });
  await bootstrap(req("POST", "panel-test-key", { action: "create-invite", audienceType: "partner", companyName: "Marca", recipientName: "Bia", expiresAt: "2026-12-31T23:59:00.000Z" }), res());

  const fetchImpl = async (url, options = {}) => {
    if (url.includes("movement_invite_aliases?on_conflict=invite_id") && options.method === "POST") return response([], 201);
    if (url.includes(`movement_invite_aliases?invite_id=eq.${inviteId}`)) return response([{ invite_id: inviteId, resend_token_ciphertext: winningCiphertext }]);
    if (url.includes("movement_invite_aliases")) return response([]);
    if (url.includes("movement_invites")) return response([{ id: inviteId, display_name: "Marca", recipient_name: "Bia", company_name: "Marca", contact: null, audience_type: "partner", status: "sent", opened_at: null, revoked_at: null, expires_at: "2026-12-31T23:59:00.000Z", created_at: "2026-08-11T12:00:00.000Z", resend_token_ciphertext: null }]);
    return response([]);
  };
  const out = res();
  await createMovementAdminHandler({ fetchImpl, env: ENV, createLegacyToken: () => "invite_losing_abcdefghijklmnopqrstuvwxyz", now: () => new Date("2026-08-12T12:00:00.000Z") })(req(), out);

  assert.equal(out.statusCode, 200);
  assert.equal(out.payload.invites[0].invitePath, "/movimento/convite/invite_winning_abcdefghijklmnopqrstuvwxyz");
});

test("movement admin API paginates invitation history before creating legacy aliases", async () => {
  const legacyId = "fa4ce3a4-bdb7-4612-b9d8-4959099d2684";
  const directCiphertext = "v1.AAAAAAAAAAAAAAAA.AAAAAAAAAAAAAAAAAAAAAA.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
  const page = Array.from({ length: 500 }, (_, index) => ({
    id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    display_name: `Convidada ${index}`,
    recipient_name: `Convidada ${index}`,
    company_name: null,
    contact: null,
    audience_type: "influencer",
    status: "sent",
    opened_at: null,
    revoked_at: null,
    expires_at: "2026-12-31T23:59:00.000Z",
    created_at: "2026-08-12T12:00:00.000Z",
    resend_token_ciphertext: directCiphertext,
  }));
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, options });
    if (url.includes("movement_invites") && url.includes("offset=0")) return response(page);
    if (url.includes("movement_invites") && url.includes("offset=500")) return response([{ ...page[0], id: legacyId, resend_token_ciphertext: null }]);
    if (url.includes("movement_invite_aliases") && options.method === "POST") return response([{ ...JSON.parse(options.body) }], 201);
    if (url.includes("movement_invite_aliases")) return response([]);
    return response([]);
  };
  const out = res();
  await createMovementAdminHandler({ fetchImpl, env: ENV, createLegacyToken: () => "invite_paginated_abcdefghijklmnopqrstuvwxyz", now: () => new Date("2026-08-12T12:00:00.000Z") })(req(), out);

  assert.equal(out.statusCode, 200);
  assert.equal(out.payload.invites.length, 501);
  assert.equal(out.payload.invites.at(-1).invitePath, "/movimento/convite/invite_paginated_abcdefghijklmnopqrstuvwxyz");
  assert.equal(calls.some((call) => call.url.includes("movement_invites") && call.url.includes("offset=500")), true);
});

test("movement admin API refuses to reissue an inactive invitation", async () => {
  const inviteId = "84ccf9b6-b170-4212-9f3d-1ce53901ca18";
  const out = res();
  await createMovementAdminHandler({
    fetchImpl: async () => response([]),
    env: ENV,
    createToken: () => "invite_reissued_abcdefghijklmnopqrstuvwxyz",
    now: () => new Date("2026-08-12T12:00:00.000Z"),
  })(req("POST", "panel-test-key", { action: "reissue-invite", inviteId }), out);

  assert.equal(out.statusCode, 409);
  assert.equal(out.payload.error, "Este convite não está ativo para reemissão.");
});

test("movement admin API creates partner invitations with company and responsible person", async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    return response([{ id: "fa4ce3a4-bdb7-4612-b9d8-4959099d2684", display_name: "Marca Parceira", recipient_name: "Bia", company_name: "Marca Parceira", audience_type: "partner", contact: "bia@marca.com", status: "sent", expires_at: "2026-12-31T23:59:00.000Z", created_at: "2026-08-11T12:00:00.000Z" }], 201);
  };
  const out = res();
  await createMovementAdminHandler({
    fetchImpl,
    env: ENV,
    createToken: () => "invite_abcdefghijklmnopqrstuvwxyz_2026",
    now: () => new Date("2026-08-11T12:00:00.000Z"),
  })(req("POST", "panel-test-key", {
    action: "create-invite",
    audienceType: "partner",
    companyName: "  Marca Parceira ",
    recipientName: " Bia ",
    contact: "bia@marca.com",
    expiresAt: "2026-12-31T23:59:00.000Z",
  }), out);

  assert.equal(out.statusCode, 201);
  assert.equal(out.payload.invitePath, "/movimento/convite/invite_abcdefghijklmnopqrstuvwxyz_2026");
  const persisted = JSON.parse(calls[0].options.body);
  assert.equal(persisted.audience_type, "partner");
  assert.equal(persisted.display_name, "Marca Parceira");
  assert.equal(persisted.recipient_name, "Bia");
  assert.equal(persisted.company_name, "Marca Parceira");
});

test("movement admin API requires company and responsible person for partner invitations", async () => {
  for (const body of [
    { audienceType: "partner", displayName: "Fallback", companyName: "", recipientName: "Bia" },
    { audienceType: "partner", displayName: "Fallback", companyName: "Marca", recipientName: "" },
  ]) {
    let called = false;
    const out = res();
    await createMovementAdminHandler({
      fetchImpl: async () => { called = true; return response([]); },
      env: ENV,
      now: () => new Date("2026-08-11T12:00:00.000Z"),
    })(req("POST", "panel-test-key", {
      action: "create-invite",
      expiresAt: "2026-12-31T23:59:00.000Z",
      ...body,
    }), out);
    assert.equal(out.statusCode, 400);
    assert.match(out.payload.error, /empresa|responsável/i);
    assert.equal(called, false);
  }
});

test("movement admin API rejects unsupported invitation audiences", async () => {
  let called = false;
  const out = res();
  await createMovementAdminHandler({ fetchImpl: async () => { called = true; return response([]); }, env: ENV })(req("POST", "panel-test-key", {
    action: "create-invite",
    audienceType: "legacy",
    displayName: "Ana",
    expiresAt: "2026-12-31T23:59:00.000Z",
  }), out);
  assert.equal(out.statusCode, 400);
  assert.equal(out.payload.error, "Público do convite inválido.");
  assert.equal(called, false);
});

test("movement admin API revokes an invitation by UUID", async () => {
  const calls = [];
  const inviteId = "fa4ce3a4-bdb7-4612-b9d8-4959099d2684";
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    return response([{ id: inviteId, status: "revoked", revoked_at: "2026-08-11T16:00:00.000Z" }]);
  };
  const out = res();
  await createMovementAdminHandler({ fetchImpl, env: ENV, now: () => new Date("2026-08-11T16:00:00.000Z") })(req("POST", "panel-test-key", {
    action: "revoke-invite",
    inviteId,
  }), out);

  assert.equal(out.statusCode, 200);
  assert.deepEqual(out.payload, { ok: true, invite: { id: inviteId, status: "revoked", revokedAt: "2026-08-11T16:00:00.000Z" } });
  assert.match(calls[0].url, /movement_invites\?id=eq\.fa4ce3a4-bdb7-4612-b9d8-4959099d2684$/);
  assert.deepEqual(JSON.parse(calls[0].options.body), { status: "revoked", revoked_at: "2026-08-11T16:00:00.000Z", updated_at: "2026-08-11T16:00:00.000Z" });
});

test("movement admin API rejects invalid revocation ids without writing", async () => {
  let called = false;
  const out = res();
  await createMovementAdminHandler({ fetchImpl: async () => { called = true; return response([]); }, env: ENV })(req("POST", "panel-test-key", {
    action: "revoke-invite",
    inviteId: "not-a-uuid",
  }), out);
  assert.equal(out.statusCode, 400);
  assert.equal(out.payload.error, "Identificador de convite inválido.");
  assert.equal(called, false);
});

test("movement admin API rejects an expired invitation before writing", async () => {
  let called = false;
  const out = res();
  await createMovementAdminHandler({
    fetchImpl: async () => { called = true; return response([]); },
    env: ENV,
    now: () => new Date("2026-08-11T12:00:00.000Z"),
  })(req("POST", "panel-test-key", {
    action: "create-invite",
    audienceType: "influencer",
    displayName: "Ana",
    expiresAt: "2026-08-10T12:00:00.000Z",
  }), out);
  assert.equal(out.statusCode, 400);
  assert.equal(out.payload.error, "Escolha uma validade futura para o convite.");
  assert.equal(called, false);
});

test("movement admin API rejects parsed bodies above 32 KiB", async () => {
  let called = false;
  const out = res();
  await createMovementAdminHandler({ fetchImpl: async () => { called = true; return response([]); }, env: ENV })(req("POST", "panel-test-key", JSON.stringify({
    action: "create-invite",
    audienceType: "influencer",
    displayName: "Ana",
    note: "x".repeat(33 * 1024),
  })), out);
  assert.equal(out.statusCode, 413);
  assert.equal(called, false);
});

test("movement admin API rejects unsupported methods", async () => {
  const out = res();
  await createMovementAdminHandler({ env: ENV })(req("DELETE"), out);
  assert.equal(out.statusCode, 405);
});
