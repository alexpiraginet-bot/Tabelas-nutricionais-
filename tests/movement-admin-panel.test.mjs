import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const panelPath = new URL("../public/painel.html", import.meta.url);
const panel = await readFile(panelPath, "utf8");

function section(source, start, end) {
  const from = source.indexOf(start);
  assert.notEqual(from, -1, `missing ${start}`);
  const to = source.indexOf(end, from);
  assert.notEqual(to, -1, `missing ${end} after ${start}`);
  return source.slice(from, to + end.length);
}

function functionBody(source, name, nextMarker) {
  return section(source, `function ${name}(`, nextMarker);
}

test("Movement admin form exposes audience-specific fields and retains the immediate-only link affordance", () => {
  const form = section(panel, '<form id="movInviteForm"', "</form>");

  assert.match(form, /<select id="movInviteAudience"[^>]*>/);
  assert.match(form, /<option value="influencer">Influenciadora<\/option>/);
  assert.match(form, /<option value="partner">Parceiro<\/option>/);
  assert.match(form, /id="movInviteName"/);
  assert.match(form, /id="movInviteCompany"/);
  assert.match(form, /id="movInviteRecipient"/);
  assert.match(form, /id="movInviteLink"/);
  assert.match(form, /id="movInviteCopy"/);
  assert.match(form, /id="movInviteNew"/);
});

test("Movement admin create handler sends exactly the audience-specific create-invite payload", () => {
  const createHandler = functionBody(panel, "createMovementInvite", '$("#movInviteExpires").min=');

  assert.match(createHandler, /audienceType:audienceType/);
  assert.match(createHandler, /action:"create-invite"/);
  assert.match(createHandler, /displayName:audienceType==="influencer"\?displayName:undefined/);
  assert.match(createHandler, /companyName:audienceType==="partner"\?companyName:undefined/);
  assert.match(createHandler, /recipientName:audienceType==="partner"\?recipientName:undefined/);
  assert.match(createHandler, /data\.invitePath/);
  assert.doesNotMatch(functionBody(panel, "renderMovimento", "function renderSejaBento"), /invitePath/);
});

test("Movement admin renders lifecycle, RSVP, and tier information while offering confirmed revocation", () => {
  const renderHandler = functionBody(panel, "renderMovimento", "function renderSejaBento");
  const revokeHandler = functionBody(panel, "revokeMovementInvite", "function renderMovimento");
  const movementPresentation = section(panel, "const MOVEMENT_STATUS_LABELS", "function renderMovimento");

  for (const label of ["Gerado", "Enviado", "Aberto", "Confirmada", "Recusada", "Selecionado", "Revogado", "Expirado"]) {
    assert.match(movementPresentation, new RegExp(label));
  }
  for (const tier of ["Select", "Experience", "Signature", "Founding Circle", "Cota Fundadora", "Cota Kit"]) {
    assert.match(movementPresentation, new RegExp(tier));
  }
  assert.match(renderHandler, /Idade da criança/);
  assert.match(renderHandler, /Interesse em transporte/);
  assert.match(renderHandler, /Novo convite/);
  assert.match(renderHandler, /Revogar convite/);
  assert.match(revokeHandler, /window\.confirm\(/);
  assert.match(revokeHandler, /action:"revoke-invite"/);
  assert.match(revokeHandler, /inviteId:invite\.id/);
  assert.match(revokeHandler, /loadMovimento\(\)/);
});
