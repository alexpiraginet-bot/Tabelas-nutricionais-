import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const panelPath = new URL("../public/painel.html", import.meta.url);
const panel = await readFile(panelPath, "utf8");
const editorPath = new URL("../public/painel-movimento-editor.js", import.meta.url);
const editor = await readFile(editorPath, "utf8");
const editorCss = await readFile(new URL("../public/painel-movimento-editor.css", import.meta.url), "utf8");

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

function sourceUntil(source, start, end) {
  const from = source.indexOf(start);
  assert.notEqual(from, -1, `missing ${start}`);
  const to = source.indexOf(end, from);
  assert.notEqual(to, -1, `missing ${end} after ${start}`);
  return source.slice(from, to);
}

function movementHandlerSource() {
  return [
    sourceUntil(panel, "async function createMovementInvite(", "\nfunction syncMovementInviteAudience"),
    sourceUntil(panel, "function syncMovementInviteAudience(", '\n$("#movInviteExpires").min='),
    sourceUntil(panel, "function movementInviteTarget(", "\nasync function revokeMovementInvite"),
    sourceUntil(panel, "async function revokeMovementInvite(", "\nfunction renderMovimento"),
  ].join("\n");
}

function element(value = "") {
  return {
    value,
    textContent: "",
    hidden: false,
    required: false,
    disabled: false,
    href: "",
    onclick: null,
    addEventListener() {},
    focus() {},
  };
}

function fixedDate(now) {
  const timestamp = new Date(now).getTime();
  assert.equal(Number.isFinite(timestamp), true, "harness clock must be a valid date");
  return class FixedDate extends Date {
    constructor(...args) { super(...(args.length ? args : [timestamp])); }
    static now() { return timestamp; }
  };
}

function movementHarness({ fetchImpl, loadMovimento = async () => {}, confirm = () => true, copyLink = () => {}, now = "2026-08-12T12:00:00.000Z" } = {}) {
  const elements = new Map(Object.entries({
    "#movInviteAudience": element("influencer"),
    "#movInviteInfluencerField": element(),
    "#movInviteCompanyField": element(),
    "#movInviteRecipientField": element(),
    "#movInviteName": element("Ana"),
    "#movInviteCompany": element("Marca Pátio"),
    "#movInviteRecipient": element("Bia Silva"),
    "#movInviteContact": element("bia@marca.test"),
    "#movInviteExpires": element("2027-01-01T12:00"),
    "#movInviteCreate": element(),
    "#movInviteCreateError": element(),
    "#movInviteResult": element(),
    "#movInviteLink": element(),
    "#movInviteCopy": element(),
    "#movError": element(),
  }));
  const context = {
    $: (selector) => {
      const found = elements.get(selector);
      assert.ok(found, `missing harness element ${selector}`);
      return found;
    },
    fetch: fetchImpl,
    localStorage: { getItem: () => "panel-key" },
    KEYSTORE: "bento:panelkey",
    window: { confirm, location: { origin: "https://bentogelateria.com" } },
    Date: fixedDate(now),
    URL,
    copyLink,
    loadMovimento,
  };
  vm.createContext(context);
  vm.runInContext(movementHandlerSource(), context);
  return { elements, context };
}

test("Movement admin form exposes audience-specific fields and explains persistent resend history", () => {
  const form = section(panel, '<form id="movInviteForm"', "</form>");

  assert.match(form, /<select id="movInviteAudience"[^>]*>/);
  assert.match(form, /<option value="influencer">Convidada<\/option>/);
  assert.match(form, /<option value="partner">Parceiro<\/option>/);
  assert.match(form, /id="movInviteName"/);
  assert.match(form, /id="movInviteCompany"/);
  assert.match(form, /id="movInviteRecipient"/);
  assert.match(form, /id="movInviteLink"/);
  assert.match(form, /id="movInviteCopy"/);
  assert.match(form, /id="movInviteNew"/);
  assert.match(form, /salvo no histórico/i);
  assert.match(panel, /\.mov-invite-grid \[hidden\]\{display:none!important\}/);
  assert.doesNotMatch(form, /só aparece neste momento/i);
});

test("Movement presentation editor is available as a mobile-safe second subtab", () => {
  assert.match(panel, /id="movAdminTabs"/);
  assert.match(panel, /data-mov-admin-tab="invites"/);
  assert.match(panel, /data-mov-admin-tab="content"/);
  assert.match(panel, /id="movContentPane"/);
  assert.match(panel, /href="\/painel-movimento-editor\.css"/);
  assert.match(panel, /src="\/painel-movimento-editor\.js"/);

  for (const id of ["movEditorAudience", "movEditorSceneList", "movEditorPreview", "movEditorForm", "movEditorSave", "movEditorRestore"]) {
    assert.match(editor, new RegExp(id));
  }
  for (const label of ["Convidada", "Parceiro", "Nome e empresa são definidos pelo link", "Foto principal", "Versão vertical para iPhone", "Intensidade da imagem", "Salvar alterações"]) {
    assert.match(editor, new RegExp(label));
  }
  assert.match(editor, /beforeunload/);
  assert.match(editor, /window\.confirm/);
  assert.match(editor, /\/api\/movimento-content\?fresh=1/);
  assert.match(editor, /\/api\/upload/);
  assert.match(editor, /function optimizeImage\(/);
  assert.match(editor, /id = "movImageCropDialog"/);
  for (const label of ["Ajuste e otimize", "Enquadramento horizontal", "Enquadramento vertical", "Zoom", "Aplicar corte e enviar"]) assert.match(editor, new RegExp(label));
  for (const ratio of ["Principal · 16:9", "Principal · 8:5", "Vertical · 9:16", "Vertical · 4:5"]) assert.match(editor, new RegExp(ratio));
  assert.match(editor, /createImageBitmap/);
  assert.match(editor, /var formats = \[\{ type: "image\/webp", extension: "webp" \}, \{ type: "image\/jpeg", extension: "jpg" \}\]/);
  assert.match(editor, /var qualities = \[\.84, \.76, \.68, \.58\]/);
  assert.match(editor, /canvas\.toBlob\(resolve, format\.type, quality\)/);
  assert.match(editorCss, /\.mov-crop-dialog\{/);
  assert.match(editorCss, /\.mov-crop-actions button\{[^}]*min-height:48px/);
  for (const field of ["imageUrl", "mobileImageUrl", "imageOpacity", "eyebrow", "title", "body", "altText"]) {
    assert.match(editor, new RegExp(field));
  }
  for (const sceneId of ["INF-08", "INF-14", "PAR-11", "PAR-16"]) assert.match(editor, new RegExp(`"${sceneId}"`));
  assert.doesNotMatch(editor, /\.innerHTML\s*=/);
});

test("Panel login gate keeps password and submit controls touch-ready on iPhone", () => {
  assert.match(panel, /\.gate input\{[^}]*min-height:44px[^}]*font-size:16px[^}]*\}/);
  assert.match(panel, /\.gate button\{[^}]*min-height:44px[^}]*\}/);
});

test("Movement admin create handler sends exactly the audience-specific create-invite payload", () => {
  const createHandler = functionBody(panel, "createMovementInvite", '$("#movInviteExpires").min=');

  assert.match(createHandler, /audienceType:audienceType/);
  assert.match(createHandler, /action:"create-invite"/);
  assert.match(createHandler, /displayName:audienceType==="influencer"\?displayName:undefined/);
  assert.match(createHandler, /companyName:audienceType==="partner"\?companyName:undefined/);
  assert.match(createHandler, /recipientName:audienceType==="partner"\?recipientName:undefined/);
  assert.match(createHandler, /data\.invitePath/);
  assert.match(functionBody(panel, "renderMovimento", "function renderSejaBento"), /movementInviteUrl\(invite\)/);
});

test("Movement admin renders reusable invite actions, legacy reissue, lifecycle, RSVP, and confirmed revocation", () => {
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
  assert.match(renderHandler, /Tamanho da convidada/);
  assert.match(panel, /Resposta antiga: camiseta/);
  assert.match(renderHandler, /Interesse em transporte/);
  assert.match(renderHandler, /Reenviar convite/);
  assert.match(renderHandler, /Copiar link/);
  assert.match(renderHandler, /Abrir convite/);
  assert.match(renderHandler, /Ativar reenvio/);
  assert.match(renderHandler, /movementInviteUrl\(invite\)/);
  assert.match(renderHandler, /Novo convite/);
  assert.match(renderHandler, /Revogar convite/);
  assert.match(revokeHandler, /window\.confirm\(/);
  assert.match(revokeHandler, /action:"revoke-invite"/);
  assert.match(revokeHandler, /inviteId:invite\.id/);
  assert.match(revokeHandler, /loadMovimento\(\)/);
  assert.match(panel, /action:"reissue-invite"/);
  assert.match(panel, /navigator\.share/);
});

test("Movement admin executes the partner switch and sends the partner create payload", async () => {
  const requests = [];
  const { elements, context } = movementHarness({
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      return { ok: true, json: async () => ({ invitePath: "/movimento/convite/opaque-token" }) };
    },
  });

  elements.get("#movInviteAudience").value = "partner";
  context.syncMovementInviteAudience();
  assert.equal(elements.get("#movInviteInfluencerField").hidden, true);
  assert.equal(elements.get("#movInviteCompanyField").hidden, false);
  assert.equal(elements.get("#movInviteRecipientField").hidden, false);
  assert.equal(elements.get("#movInviteName").required, false);
  assert.equal(elements.get("#movInviteCompany").required, true);
  assert.equal(elements.get("#movInviteRecipient").required, true);

  let prevented = false;
  await context.createMovementInvite({ preventDefault() { prevented = true; } });

  assert.equal(prevented, true);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, "/api/movimento-admin");
  assert.deepEqual(JSON.parse(requests[0].options.body), {
    action: "create-invite",
    audienceType: "partner",
    companyName: "Marca Pátio",
    recipientName: "Bia Silva",
    contact: "bia@marca.test",
    expiresAt: new Date("2027-01-01T12:00").toISOString(),
  });
  assert.equal(elements.get("#movInviteResult").hidden, false);
  assert.equal(elements.get("#movInviteLink").href, "https://bentogelateria.com/movimento/convite/opaque-token");
});

test("Movement admin validates expiration against the harness-defined clock", async () => {
  const requests = [];
  const { elements, context } = movementHarness({
    now: "2028-01-01T12:00:00.000Z",
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      return { ok: true, json: async () => ({ invitePath: "/movimento/convite/opaque-token" }) };
    },
  });

  await context.createMovementInvite({ preventDefault() {} });

  assert.equal(requests.length, 0);
  assert.equal(elements.get("#movInviteCreateError").textContent, "Escolha uma validade futura para o convite.");
});

test("Movement admin keeps a successful revocation final when the following refresh fails", async () => {
  const requests = [];
  const confirmations = [];
  const { elements, context } = movementHarness({
    confirm: (message) => { confirmations.push(message); return true; },
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      return { ok: true, json: async () => ({ ok: true }) };
    },
    loadMovimento: async () => { throw new Error("GET 502"); },
  });
  const invite = { id: "fa4ce3a4-bdb7-4612-b9d8-4959099d2684", audienceType: "partner", companyName: "Marca Pátio", status: "sent" };
  const button = element();

  await context.revokeMovementInvite(invite, button);

  assert.equal(confirmations.length, 1);
  assert.match(confirmations[0], /Marca Pátio/);
  assert.deepEqual(JSON.parse(requests[0].options.body), { action: "revoke-invite", inviteId: invite.id });
  assert.equal(invite.status, "revoked");
  assert.equal(button.disabled, true);
  assert.equal(button.textContent, "Revogado");
  assert.equal(elements.get("#movError").textContent, "Convite revogado; atualização pendente.");
});

test("Movement admin activates resend on the same legacy invite and exposes the replacement link", async () => {
  const requests = [];
  const confirmations = [];
  const copied = [];
  const { elements, context } = movementHarness({
    confirm: (message) => { confirmations.push(message); return true; },
    copyLink: (url) => copied.push(url),
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      return { ok: true, json: async () => ({ invitePath: "/movimento/convite/reissued-opaque-token-abcdefghijklmnopqrstuvwxyz" }) };
    },
  });
  const invite = { id: "84ccf9b6-b170-4212-9f3d-1ce53901ca18", audienceType: "influencer", displayName: "Ana", status: "responded", invitePath: null };
  const button = element();

  await context.reissueMovementInvite(invite, button);

  assert.equal(confirmations.length, 1);
  assert.match(confirmations[0], /endereço anterior deixará de funcionar/i);
  assert.deepEqual(JSON.parse(requests[0].options.body), { action: "reissue-invite", inviteId: invite.id });
  assert.equal(invite.status, "responded");
  assert.equal(invite.invitePath, "/movimento/convite/reissued-opaque-token-abcdefghijklmnopqrstuvwxyz");
  assert.equal(elements.get("#movInviteResult").hidden, false);
  assert.equal(elements.get("#movInviteLink").href, "https://bentogelateria.com/movimento/convite/reissued-opaque-token-abcdefghijklmnopqrstuvwxyz");
  assert.deepEqual(copied, ["https://bentogelateria.com/movimento/convite/reissued-opaque-token-abcdefghijklmnopqrstuvwxyz"]);
});
