import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function readRsvpSurface() {
  const [flow, site, css] = await Promise.all([
    readFile(new URL("../src/movimento/RsvpFlow.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/movimento/MovementSite.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/movimento/movement.css", import.meta.url), "utf8"),
  ]);
  return { flow, site, css };
}

test("personal influencer invitation opens one persistent RSVP sheet without loading the invite again", async () => {
  const { flow, site } = await readRsvpSurface();

  assert.match(site, /<RsvpFlow token={token} invite={invite} currentRsvp={currentRsvp}\/>/);
  assert.match(flow, /function RsvpFlow\(\{ token, invite, currentRsvp \}\)/);
  assert.doesNotMatch(flow, /fetch\(`\/api\/movimento-rsvp\?token=/);
  assert.match(flow, /Confirmar meu lugar/);
  assert.match(flow, /role="dialog" aria-modal="true"/);
  assert.match(flow, /mv-rsvp-sheet/);
  assert.match(flow, /Escape/);
  assert.match(flow, /document\.body\.style\.overflow/);
  assert.match(flow, /triggerRef\.current\?\.focus\(\)/);
  assert.doesNotMatch(flow, /\}, \[open, state\]\);/);
});

test("influencer RSVP keeps every decision in the same sheet with the approved boundaries", async () => {
  const { flow } = await readRsvpSurface();

  for (const text of [
    "Estarei presente",
    "Desta vez, acompanho de longe",
    "Camiseta da influenciadora",
    "Roupa de treino da influenciadora",
    "Meu marido",
    "Minha mãe",
    "Uma criança",
    "Idade da criança",
    "Tamanho aproximado da criança",
    "Quero ser avisada caso haja transporte exclusivo disponível",
    "Possível surpresa infantil em confirmação; o tamanho não garante produto ou modelo.",
    "Li e compreendi a",
    "Autorizo o uso da minha imagem",
  ]) assert.match(flow, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

  assert.match(flow, /childAge/);
  assert.match(flow, /maxLength="40"/);
  assert.match(flow, /name="adultCompanionType"/);
  assert.match(flow, /name="childCount"/);
  assert.match(flow, /transportInterest/);
  assert.doesNotMatch(flow, /address/i);
});

test("RSVP sheet supports review, success and editing while meeting mobile dialog requirements", async () => {
  const { flow, css } = await readRsvpSurface();

  assert.match(flow, /setStep\("review"\)/);
  assert.match(flow, /Resposta registrada/);
  assert.match(flow, /Editar minha resposta/);
  assert.match(flow, /setOpen\(false\)/);
  assert.match(css, /\.mv-rsvp-sheet\{[^}]*100dvh/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /\.mv-rsvp-sheet input[^}]*font-size:\s*16px/);
  assert.match(css, /\.mv-rsvp-sheet [^{]*button[^}]*min-height:\s*44px/);
  assert.match(css, /\.mv-rsvp-sheet[^}]*overflow-y:\s*auto/);
  assert.match(css, /:focus-visible/);
});
