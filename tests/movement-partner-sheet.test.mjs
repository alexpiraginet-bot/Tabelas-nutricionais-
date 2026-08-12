import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function readPartnerSurface() {
  const [flow, site, css, content] = await Promise.all([
    readFile(new URL("../src/movimento/PartnerInterestFlow.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/movimento/MovementSite.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/movimento/movement.css", import.meta.url), "utf8"),
    readFile(new URL("../src/movimento/movement-content.js", import.meta.url), "utf8"),
  ]);
  return { flow, site, css, content };
}

test("personal partner invitation opens one persistent selection sheet from the resolved invite", async () => {
  const { flow, site, css } = await readPartnerSurface();

  assert.match(site, /import PartnerInterestFlow from "\.\/PartnerInterestFlow\.jsx";/);
  assert.equal(site.match(/<PartnerInterestFlow token={token} invite={invite} currentPartnerLead={currentPartnerLead}\/>/g)?.length, 1);
  assert.match(site, /const hasPersistentPartnerCta = personal && audience === "partner";/);
  assert.match(site, /data-partner-cta=\{hasPersistentPartnerCta \|\| undefined\}/);
  assert.match(flow, /function PartnerInterestFlow\(\{ token, invite, currentPartnerLead \}\)/);
  assert.equal(flow.match(/className="mv-partner-persistent-cta"/g)?.length, 1);
  assert.match(flow, /Escolher participação/);
  assert.match(flow, /onClick=\{\(\) => \{ setOpen\(true\)/);
  assert.doesNotMatch(flow, /fetch\(`\/api\/movimento-(?:rsvp|parceiros)\?token=/);
  assert.match(flow, /fetch\("\/api\/movimento-parceiros", \{/);
  assert.match(flow, /token,\s*\.\.\.form/);
  assert.match(css, /\.mv-partner-persistent-cta\{position:fixed;/);
  assert.match(css, /\.mv-root\[data-partner-cta\]\{[^}]*safe-area-inset-bottom/);
});

test("partner sheet contains the four approved cumulative participations and no commercial promise", async () => {
  const { flow, content } = await readPartnerSurface();
  const positions = ["Select", "Experience", "Signature", "Founding Circle"].map((label) => flow.indexOf(`label: "${label}"`));

  assert.ok(positions.every((position) => position >= 0));
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
  assert.match(flow, /includes: PARTNER_TIERS\[0\]\.includes/);
  assert.match(flow, /includes: PARTNER_TIERS\[3\]\.includes/);
  for (const text of [
    "Nome ou logo oficial na composição coletiva do backdrop",
    "Tudo de Select",
    "Tudo de Experience",
    "Tudo de Signature",
    "Mockup das aplicações para aprovação",
    "Estudo de viabilidade para picolé ou rótulo co-branded",
    "Nenhuma opção promete preço, exclusividade, alcance, publicação, categoria protegida ou continuidade anual.",
  ]) assert.match(content, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

  assert.match(flow, /A escolha registra interesse e não constitui reserva, exclusividade ou contrato\./);

  assert.doesNotMatch(flow, /(?:preço|alcance|exclusividade|publicação|categoria protegida|continuidade anual) garantid[oa]/i);
});

test("partner sheet locks invited identity, preserves editable contact and keeps review and success in one dialog", async () => {
  const { flow, css } = await readPartnerSurface();

  assert.match(flow, /companyName: invite\?\.companyName \|\| ""/);
  assert.match(flow, /contactName: invite\?\.recipientName \|\| ""/);
  assert.match(flow, /currentPartnerLead\?\.email/);
  assert.match(flow, /currentPartnerLead\?\.phone/);
  assert.match(flow, /value=\{form\.companyName\}[^>]*readOnly/);
  assert.match(flow, /value=\{form\.contactName\}[^>]*readOnly/);
  assert.match(flow, /E-mail profissional/);
  assert.match(flow, /Telefone ou WhatsApp/);
  assert.match(flow, /step === "review"/);
  assert.match(flow, /step === "success"/);
  assert.match(flow, /Editar seleção/);
  assert.match(flow, /role="dialog" aria-modal="true"/);
  assert.match(flow, /Escape/);
  assert.match(flow, /FOCUSABLE_SELECTOR/);
  assert.match(flow, /document\.body\.style\.overflow/);
  assert.match(flow, /triggerRef\.current\?\.focus\(\)/);
  assert.match(css, /\.mv-partner-sheet\{[^}]*100dvh/);
  assert.match(css, /\.mv-partner-sheet[^}]*overflow-y:\s*auto/);
  assert.match(css, /\.mv-partner-sheet input[^}]*font-size:\s*16px/);
  assert.match(css, /\.mv-partner-sheet [^{]*button[^}]*min-height:\s*44px/);
});
