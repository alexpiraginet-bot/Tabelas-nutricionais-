import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
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
    { name: "Aline Mareto", handle: "@alinemareto", image: "/movimento/guests/aline-mareto.webp", instagramUrl: "https://www.instagram.com/alinemareto/" },
    { name: "Isadora Binow", handle: "@isa_binow", image: "/movimento/guests/isadora-binow.webp", instagramUrl: "https://www.instagram.com/isa_binow/" },
    { name: "Sara Broedel", handle: "@sarabroedel", image: "/movimento/guests/sara-broedel.webp", instagramUrl: "https://www.instagram.com/sarabroedel/" },
    { name: "Rayanni Thomazini", handle: "@rayannithomazini", image: "/movimento/guests/rayanni-thomazini.webp", instagramUrl: "https://www.instagram.com/rayannithomazini/" },
    { name: "Lara Martinelle", handle: "@lara.martinelle", image: "/movimento/guests/lara-martinelle.webp", instagramUrl: "https://www.instagram.com/lara.martinelle/" },
    { name: "Bianca Romanha", handle: "@biancaromanha_", image: "/movimento/guests/bianca-romanha.webp", instagramUrl: "https://www.instagram.com/biancaromanha_/" },
    { name: "Italla Baptisti", handle: "@italla", image: "/movimento/guests/italla-baptisti.webp", instagramUrl: "https://www.instagram.com/italla/" },
    { name: "Carolina Neves", handle: "@carolinaneves_", image: "/movimento/guests/carolina-neves.webp", instagramUrl: "https://www.instagram.com/carolinaneves_/" },
    { name: "Marina Coser", handle: "@marinacoser", image: "/movimento/guests/marina-coser.webp", instagramUrl: "https://www.instagram.com/marinacoser/" },
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

  assert.match(site, /import MovementStoryAtlas, \{[^}]*PartnerGuestProof[^}]*\} from "\.\/MovementStoryAtlas\.jsx";/);
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
  assert.doesNotMatch(atlas, /<small>{scene\.disclosure}<\/small>/);
  assert.doesNotMatch(atlas, /function StoryStage/);
  assert.match(atlas, /Como \{companyName\} pode viver este momento\./);
});

test("partner proposal renders nine real guest portraits with public Instagram links and no public AI label", async () => {
  const vite = await createServer({
    appType: "custom",
    logLevel: "error",
    server: { middlewareMode: true },
  });

  try {
    const [{ PartnerGuestProof }, { default: MovementSite }] = await Promise.all([
      vite.ssrLoadModule("/src/movimento/MovementStoryAtlas.jsx"),
      vite.ssrLoadModule("/src/movimento/MovementSite.jsx"),
    ]);
    const guestMarkup = renderToStaticMarkup(createElement(PartnerGuestProof));
    const proposalMarkup = renderToStaticMarkup(createElement(MovementSite, { mode: "partner" }));

    assert.equal((guestMarkup.match(/class="mv-guest-portrait"/g) || []).length, 9);
    assert.equal((guestMarkup.match(/class="mv-guest-instagram"/g) || []).length, 9);
    assert.equal((guestMarkup.match(/target="_blank"/g) || []).length, 9);
    assert.match(guestMarkup, /alt="Retrato de Italla Baptisti"/);
    assert.match(guestMarkup, /href="https:\/\/www\.instagram\.com\/marinacoser\/"/);
    assert.doesNotMatch(proposalMarkup, /Visualização conceitual gerada por IA/i);
  } finally {
    await vite.close();
  }
});

test("both proposals render asset-backed organic gold signatures without adding screen-reader noise", async () => {
  const vite = await createServer({
    appType: "custom",
    logLevel: "error",
    server: { middlewareMode: true },
  });

  try {
    const { default: MovementSite } = await vite.ssrLoadModule("/src/movimento/MovementSite.jsx");
    const influencerMarkup = renderToStaticMarkup(createElement(MovementSite, { mode: "influencer" }));
    const partnerMarkup = renderToStaticMarkup(createElement(MovementSite, { mode: "partner" }));

    for (const markup of [influencerMarkup, partnerMarkup]) {
      const ornaments = [...markup.matchAll(/<img class="mv-organic-line[^>]*>/g)].map(([tag]) => tag);
      assert.ok(ornaments.length >= 8);
      assert.match(markup, /src="\/movimento\/ornaments\/gold-flow-horizontal\.webp"/);
      assert.match(markup, /src="\/movimento\/ornaments\/gold-flow-vertical\.webp"/);
      for (const ornament of ornaments) {
        assert.match(ornament, /alt=""/);
        assert.match(ornament, /aria-hidden="true"/);
      }
    }
  } finally {
    await vite.close();
  }
});

test("macro gallery keeps scene copy in Details instead of clipping it over thumbnails", async () => {
  const vite = await createServer({
    appType: "custom",
    logLevel: "error",
    server: { middlewareMode: true },
  });

  try {
    const { default: MovementStoryAtlas } = await vite.ssrLoadModule("/src/movimento/MovementStoryAtlas.jsx");
    const PictureComponent = ({ asset }) => createElement("img", { alt: asset.alt });
    const markup = renderToStaticMarkup(createElement(MovementStoryAtlas, {
      audience: "influencer",
      scenes: content.INFLUENCER_SCENES,
      PictureComponent,
    }));

    assert.equal((markup.match(/data-gallery-slot=/g) || []).length, 14);
    assert.doesNotMatch(markup, /<figcaption>/);
    assert.doesNotMatch(markup, /V60, espresso e café coado com tempo para perceber cada detalhe\./);
    assert.match(markup, /alt="Dois profissionais preparando cafés especiais em V60 e máquina de espresso diante das convidadas"/);
  } finally {
    await vite.close();
  }
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

test("programmatic dialog heading focus does not look like an interactive gold frame", async () => {
  const css = await readFile(new URL("../src/movimento/movement.css", import.meta.url), "utf8");

  assert.match(css, /\.mv-story-detail>h2:focus-visible\{outline:none\}/);
});

test("guest cards mask decorative lines before they can cross portraits", async () => {
  const css = await readFile(new URL("../src/movimento/movement.css", import.meta.url), "utf8");

  assert.match(css, /\.mv-guest-featured article\{background:#ebe3d7\}/);
});

test("partner proof uses invited-guest language and precedes participation tiers", async () => {
  const [site, atlas] = await Promise.all([
    readFile(new URL("../src/movimento/MovementSite.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/movimento/MovementStoryAtlas.jsx", import.meta.url), "utf8"),
  ]);

  assert.match(site, /import MovementStoryAtlas, \{[^}]*PartnerGuestProof[^}]*\} from "\.\/MovementStoryAtlas\.jsx";/);
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
  const atlasCss = css.slice(css.indexOf("/* Editorial story deck"));
  const compactMediaStart = atlasCss.indexOf("@media(max-width:1023px){");
  const compactMediaEnd = atlasCss.indexOf("@media(", compactMediaStart + 1);
  const compactAtlasCss = atlasCss.slice(compactMediaStart, compactMediaEnd);

  assert.match(css, /\.mv-story-track\{[^}]*display:grid[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/s);
  assert.match(css, /\.mv-territory\{[^}]*aspect-ratio:16\/9/s);
  assert.doesNotMatch(css, /\.mv-territory\{[^}]*min-height:calc\(100svh - 72px\)/s);
  assert.match(css, /\.mv-territory-frame\{[^}]*grid-template-columns:repeat\(12,minmax\(0,1fr\)\)/s);
  assert.match(css, /\.mv-territory-gallery\{[^}]*display:grid[^}]*grid-template-columns:repeat\(12,minmax\(0,1fr\)\)/s);
  assert.match(css, /\.mv-story-detail\{[^}]*width:min\(720px,100%\)/s);
  assert.match(css, /\.mv-guest-featured\{[^}]*grid-template-columns:repeat\(3,1fr\)/s);
  assert.notEqual(compactMediaStart, -1);
  assert.match(compactAtlasCss, /\.mv-story-track\{[^}]*grid-template-columns:1fr[^}]*\}/);
  assert.match(compactAtlasCss, /\.mv-territory,\.mv-territory:last-child\{[^}]*aspect-ratio:16\/9[^}]*\}/);
  assert.match(compactAtlasCss, /\.mv-territory-frame\{[^}]*grid-template-columns:repeat\(12,minmax\(0,1fr\)\)[^}]*\}/);
  assert.match(compactAtlasCss, /\.mv-territory-gallery[^}]*height:100%[^}]*\}/);
  assert.match(compactAtlasCss, /\.mv-territory-explore\{[^}]*min-height:44px[^}]*\}/);
  assert.match(atlasCss, /@media\(max-width:900px\) and \(orientation:landscape\)\{[\s\S]*?\.mv-story-atlas-head,\.mv-territory,\.mv-territory:last-child\{[^}]*height:calc\(100svh - 72px\)[^}]*aspect-ratio:auto[^}]*\}/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)\{[^}]*html\{scroll-behavior:auto\}/s);
  assert.doesNotMatch(css, /@media\(prefers-reduced-motion:reduce\)[\s\S]*?\.mv-root \*\{[^}]*transition:none/s);
});

test("production audit covers the editorial deck contract", async () => {
  const audit = await readFile(new URL("../scripts/check-movement-v2.mjs", import.meta.url), "utf8");

  assert.match(audit, /src\/movimento\/MovementStoryAtlas\.jsx/);
  assert.match(audit, /atlas must expose five territories/);
  assert.match(audit, /partner guest proof must expose nine featured profiles/);
  assert.match(audit, /partner guest list must expose 36 names/);
});
