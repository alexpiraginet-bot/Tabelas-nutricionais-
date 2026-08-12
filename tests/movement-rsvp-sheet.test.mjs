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
  const { flow, site, css } = await readRsvpSurface();

  assert.equal(site.match(/<RsvpFlow token={token} invite={invite} currentRsvp={currentRsvp}\/>/g)?.length, 1);
  assert.match(flow, /function RsvpFlow\(\{ token, invite, currentRsvp \}\)/);
  assert.doesNotMatch(flow, /fetch\(`\/api\/movimento-rsvp\?token=/);
  assert.equal(flow.match(/className="mv-rsvp-persistent-cta"/g)?.length, 1);
  assert.match(flow, /onClick=\{\(\) => \{ setOpen\(true\)/);
  assert.match(site, /const showHeroCta = !\(personal && audience === "influencer"\);/);
  assert.match(site, /\{showHeroCta && <a className="mv-hero-cta"/);
  assert.match(css, /\.mv-rsvp-persistent-cta\{position:fixed;/);
  assert.match(site, /const hasPersistentRsvpCta = personal && audience === "influencer";/);
  assert.match(site, /className=\{`mv-root\$\{hasPersistentRsvpCta \? " has-rsvp-cta" : ""\}`\}/);
  assert.match(site, /\{hasPersistentRsvpCta && <RsvpFlow/);
  assert.match(css, /\.mv-root\.has-rsvp-cta\{[^}]*padding-bottom:\s*calc\(52px \+ 32px \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(site, /<footer className="mv-footer">.*<a href="\/\?privacidade">Privacidade<\/a><\/footer>/);
  assert.match(flow, /role="dialog" aria-modal="true"/);
  assert.match(flow, /mv-rsvp-sheet/);
  assert.match(flow, /Escape/);
  assert.match(flow, /document\.body\.style\.overflow/);
  assert.match(flow, /triggerRef\.current\?\.focus\(\)/);
  assert.doesNotMatch(flow, /\}, \[open, state\]\);/);
});

test("RSVP dialog traps forward and reverse keyboard focus", async () => {
  const { flow } = await readRsvpSurface();

  assert.match(flow, /const FOCUSABLE_SELECTOR =/);
  assert.match(flow, /dialogRef\.current\?\.querySelectorAll\(FOCUSABLE_SELECTOR\)/);
  assert.match(flow, /event\.key !== "Tab"/);
  assert.match(flow, /event\.shiftKey/);
  assert.match(flow, /event\.preventDefault\(\)/);
  assert.match(flow, /activeElement === dialogRef\.current/);
  assert.match(flow, /firstFocusable\.focus\(\)/);
  assert.match(flow, /lastFocusable\.focus\(\)/);
});

test("RSVP moves focus to the heading whenever the sheet changes step", async () => {
  const { flow } = await readRsvpSurface();

  assert.match(flow, /const stepHeadingRef = useRef\(null\)/);
  assert.match(flow, /stepHeadingRef\.current\?\.focus\(\)/);
  assert.match(flow, /\[open, step\]/);
  assert.equal(flow.match(/ref=\{stepHeadingRef\} tabIndex="-1"/g)?.length, 3);
});

test("influencer RSVP keeps every decision in the same sheet with the approved boundaries", async () => {
  const { flow } = await readRsvpSurface();

  for (const text of [
    "Estarei presente",
    "Desta vez, acompanho de longe",
    "Qual tamanho você usa?",
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

  assert.equal(flow.match(/<legend>Qual tamanho você usa\?<\/legend>/g)?.length, 1);
  assert.doesNotMatch(flow, /Usaremos este tamanho como referência/);
  assert.doesNotMatch(flow, /influenciadora/i);
  assert.doesNotMatch(flow, /name="shirtSize"|name="trainingOutfitSize"/);
  assert.match(flow, /name="outfitSize"/);

  assert.match(flow, /childAge/);
  assert.match(flow, /maxLength="40"/);
  assert.match(flow, /name="adultCompanionType"/);
  assert.match(flow, /name="childCount"/);
  assert.match(flow, /transportInterest/);
  assert.doesNotMatch(flow, /address/i);
});

test("RSVP sheet supports review, success and editing while meeting mobile dialog requirements", async () => {
  const { flow, css } = await readRsvpSurface();
  const reviewStart = flow.indexOf('step === "review"');
  const reviewEnd = flow.indexOf('step === "success"', reviewStart);
  const review = flow.slice(reviewStart, reviewEnd);

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
  assert.match(css, /\.mv-rsvp-size-options label:focus-within\{[^}]*outline:/);
  assert.match(review, /Acompanhante adulto/);
  assert.match(review, /<dt>Tamanho<\/dt><dd>\{form\.outfitSize\}<\/dd>/);
  assert.doesNotMatch(review, /<dt>Camiseta<\/dt>|<dt>Roupa de treino<\/dt>/);
  assert.match(review, /ADULT_COMPANION_LABELS\[form\.adultCompanionType\]/);
  assert.match(review, /form\.childCount === 1/);
  assert.match(review, /Idade da criança/);
  assert.match(review, /Tamanho aproximado da criança/);
});

test("child age uses the domain safety bound without presenting an admission cutoff", async () => {
  const { flow } = await readRsvpSurface();

  assert.match(flow, /childAge < 0 \|\| childAge > 120/);
  assert.match(flow, /type="number" min="0" max="120"/);
  assert.match(flow, /limite técnico de armazenamento/);
  assert.match(flow, /não limita a participação/);
});
