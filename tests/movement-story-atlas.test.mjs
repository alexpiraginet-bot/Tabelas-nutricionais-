import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as content from "../src/movimento/movement-content.js";

test("five territories map every secondary scene exactly once", () => {
  assert.ok(Array.isArray(content.MOVEMENT_TERRITORIES), "MOVEMENT_TERRITORIES must be exported");
  assert.equal(content.MOVEMENT_TERRITORIES.length, 5);

  for (const [audience, scenes] of [
    ["influencer", content.INFLUENCER_SCENES],
    ["partner", content.PARTNER_SCENES],
  ]) {
    assert.equal(typeof content.buildMovementTerritories, "function");
    const groups = content.buildMovementTerritories(audience, scenes);
    const ids = groups.flatMap(({ scenes: grouped }) => grouped.map(({ assetId }) => assetId));
    assert.deepEqual(new Set(ids), new Set(scenes.map(({ assetId }) => assetId)));
    assert.equal(ids.length, new Set(ids).size);
    assert.ok(groups.find(({ id }) => id === "movement").headline.includes("Jonatas Correa"));
  }
});

test("territories expose safe editable backgrounds with automatic readable ink", () => {
  assert.deepEqual(content.MOVEMENT_TERRITORIES.map(({ backgroundColor }) => backgroundColor), ["#F2EDE4", "#10291E", "#FFFDF9", "#EBE3D7", "#F2EDE4"]);
  assert.equal(content.movementTerritoryThemeSceneId("influencer", "arrival"), "INF-THEME-ARRIVAL");
  assert.equal(content.movementTerritoryThemeSceneId("partner", "care"), "PAR-THEME-CARE");
  assert.equal(content.movementForegroundScheme("#10291E"), "light");
  assert.equal(content.movementForegroundScheme("#FFFDF9"), "dark");
});

test("safe hashes resolve without personal data", () => {
  assert.equal(typeof content.resolveMovementStoryHash, "function");
  assert.deepEqual(content.resolveMovementStoryHash("#mobilidade"), { territoryId: "arrival", sceneId: "PAR-02" });
  assert.deepEqual(content.resolveMovementStoryHash("#cuidado"), { territoryId: "care", sceneId: null });
  assert.equal(content.resolveMovementStoryHash("#token-secreto"), null);
});

test("partner social proof is curated without metrics or confirmation claims", () => {
  assert.equal(content.PARTNER_GUESTS?.length, 36);
  assert.deepEqual(content.PARTNER_FEATURED_GUESTS, [
    "Aline Mareto",
    "Isadora Binow",
    "Sara Broedel",
    "Rayanni Thomazini",
    "Lara Martinelle",
    "Bianca Romanha",
  ]);
  assert.doesNotMatch(
    JSON.stringify({ guests: content.PARTNER_GUESTS, featured: content.PARTNER_FEATURED_GUESTS }),
    /\b\d+[.,]?\d*k\b|seguidores|confirmad[ao]s?/i,
  );
});

test("Jonatas Correa is factual content in both proposals", () => {
  assert.equal(content.EVENT.training, "Aulão funcional com Jonatas Correa");
  assert.match(content.INFLUENCER_SCENES.find(({ assetId }) => assetId === "INF-03").text, /Jonatas Correa/);
  assert.match(content.PARTNER_SCENES.find(({ assetId }) => assetId === "PAR-04").text, /Jonatas Correa/);
});

test("public presentation renders a five-slide editorial deck instead of the full scene reel", async () => {
  const [site, atlas] = await Promise.all([
    readFile(new URL("../src/movimento/MovementSite.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/movimento/MovementStoryAtlas.jsx", import.meta.url), "utf8").catch(() => ""),
  ]);

  assert.match(site, /import MovementStoryAtlas, \{ PartnerGuestProof \} from "\.\/MovementStoryAtlas\.jsx";/);
  assert.match(site, /<MovementStoryAtlas audience="influencer" scenes={scenes} territoryBackgrounds={territoryBackgrounds} PictureComponent={ScenePicture}\/>/);
  assert.match(site, /<MovementStoryAtlas audience="partner" scenes={scenes} territoryBackgrounds={territoryBackgrounds} companyName={companyName} PictureComponent={ScenePicture}\/>/);
  assert.doesNotMatch(site, /mv-scene-reel/);
  assert.doesNotMatch(site, /InfluencerChapters/);
  assert.match(atlas, /new IntersectionObserver/);
  assert.match(atlas, /data-territory-id={territory\.id}/);
  assert.match(atlas, /String\(activeIndex \+ 1\)\.padStart\(2, "0"\)/);
  assert.match(atlas, /mv-territory-layout-\$\{\(index % 3\) \+ 1\}/);
  assert.match(atlas, /territory\.scenes\.slice\(0, 3\)\.map/);
  assert.match(atlas, /data-gallery-slot={sceneIndex \+ 1}/);
  assert.match(atlas, /territoryBackgrounds/);
  assert.match(atlas, /"--mv-territory-bg": territory\.backgroundColor/);
  assert.match(atlas, /data-color-scheme={territory\.colorScheme}/);
  assert.match(atlas, />Detalhes<ArrowRight/);
  assert.doesNotMatch(atlas, />Ampliar<ArrowRight/);
  assert.doesNotMatch(atlas, /function StoryStage/);
  assert.match(atlas, /Como \{companyName\} pode viver este momento\./);
});

test("territory detail is keyboard-safe and mobility is deep-linkable", async () => {
  const source = await readFile(new URL("../src/movimento/MovementStoryAtlas.jsx", import.meta.url), "utf8");

  assert.match(source, /role="dialog" aria-modal="true"/);
  assert.match(source, /aria-expanded={openTerritoryId === territory\.id}/);
  assert.match(source, /FOCUSABLE_SELECTOR/);
  assert.match(source, /event\.key === "Escape"/);
  assert.match(source, /document\.body\.style\.overflow = "hidden"/);
  assert.match(source, /triggerRef\.current\?\.focus\(\)/);
  assert.match(source, /resolveMovementStoryHash\(window\.location\.hash\)/);
  assert.match(source, /data-requested-scene={scene\.assetId === requestedSceneId \|\| undefined}/);
  assert.match(source, /history\.replaceState\(null, "", `#\$\{territory\.slug\}`\)/);
});

test("partner proof uses invited-guest language and precedes participation tiers", async () => {
  const [site, atlas] = await Promise.all([
    readFile(new URL("../src/movimento/MovementSite.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/movimento/MovementStoryAtlas.jsx", import.meta.url), "utf8"),
  ]);

  assert.match(site, /import MovementStoryAtlas, \{ PartnerGuestProof \} from "\.\/MovementStoryAtlas\.jsx";/);
  assert.ok(site.indexOf("<PartnerGuestProof/>") < site.indexOf("<PartnerTiers/>"));
  assert.match(atlas, /Convidadas selecionadas/);
  assert.match(atlas, /Uma manhã desenhada para pessoas que já movem comunidades\./);
  assert.match(atlas, /Conhecer as convidadas/);
  assert.match(atlas, /PARTNER_FEATURED_GUESTS\.map/);
  assert.match(atlas, /PARTNER_GUESTS\.map/);
  assert.doesNotMatch(atlas, /influenciadoras|presenças confirmadas|seguidores|movement_invites|movement_rsvps/i);
});

test("atlas styling keeps every territory in a compact horizontal deck", async () => {
  const css = await readFile(new URL("../src/movimento/movement.css", import.meta.url), "utf8");

  assert.match(css, /\.mv-story-track\{[^}]*display:grid[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/s);
  assert.match(css, /\.mv-territory\{[^}]*aspect-ratio:16\/9/s);
  assert.doesNotMatch(css, /\.mv-territory\{[^}]*min-height:calc\(100svh - 72px\)/s);
  assert.match(css, /\.mv-territory-frame\{[^}]*grid-template-columns:repeat\(12,minmax\(0,1fr\)\)/s);
  assert.match(css, /\.mv-territory-gallery\{[^}]*display:grid[^}]*grid-template-columns:repeat\(12,minmax\(0,1fr\)\)/s);
  assert.match(css, /\.mv-story-detail\{[^}]*width:min\(720px,100%\)/s);
  assert.match(css, /\.mv-guest-featured\{[^}]*grid-template-columns:repeat\(3,1fr\)/s);
  assert.match(css, /@media\(max-width:900px\)\{[\s\S]*?\.mv-story-track\{[^}]*grid-template-columns:1fr[^}]*\}/);
  assert.match(css, /@media\(max-width:900px\)\{[\s\S]*?\.mv-territory\{[^}]*aspect-ratio:16\/9[^}]*\}/);
  assert.match(css, /@media\(max-width:900px\)\{[\s\S]*?\.mv-territory-frame\{[^}]*grid-template-columns:repeat\(12,minmax\(0,1fr\)\)[^}]*\}/);
  assert.match(css, /@media\(max-width:900px\)\{[\s\S]*?\.mv-territory-gallery[^}]*height:100%[^}]*\}/);
  assert.match(css, /@media\(max-width:900px\)\{[\s\S]*?\.mv-territory-explore\{[^}]*min-height:44px[^}]*\}/);
  assert.match(css, /@media\(max-width:900px\) and \(orientation:landscape\)\{[\s\S]*?\.mv-story-atlas-head,\.mv-territory,\.mv-territory:last-child\{[^}]*height:calc\(100svh - 72px\)[^}]*aspect-ratio:auto[^}]*\}/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)\{[^}]*html\{scroll-behavior:auto\}/s);
  assert.doesNotMatch(css, /@media\(prefers-reduced-motion:reduce\)[\s\S]*?\.mv-root \*\{[^}]*transition:none/s);
});

test("production audit covers the editorial deck contract", async () => {
  const audit = await readFile(new URL("../scripts/check-movement-v2.mjs", import.meta.url), "utf8");

  assert.match(audit, /src\/movimento\/MovementStoryAtlas\.jsx/);
  assert.match(audit, /atlas must expose five territories/);
  assert.match(audit, /partner guest proof must expose six featured names/);
  assert.match(audit, /partner guest list must expose 36 names/);
});
