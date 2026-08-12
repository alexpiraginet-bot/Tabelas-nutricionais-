import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  applyMovementContentOverrides,
  loadMovementContentOverrides,
  resolveMovementMediaOverride,
} from "../src/movimento/useMovementContent.js";

const base = {
  hero: {
    asset: { id: "INF-HERO", alt: "Hero original" },
    kicker: "Convite original",
    fallbackTitle: "Título original",
    text: "Texto original",
  },
  scenes: [
    { id: "welcome", assetId: "INF-01", eyebrow: "Original", title: "Título", text: "Corpo", alt: "Alt original", asset: { id: "INF-01", alt: "Alt original" } },
  ],
};

test("movement content overrides merge allowed hero and scene fields without mutating defaults", () => {
  const merged = applyMovementContentOverrides(base, [
    { sceneId: "INF-HERO", revision: 2, override: { imageUrl: "https://cdn.example/hero.webp", mobileImageUrl: "/hero-mobile.webp", imageOpacity: 0.64, eyebrow: "Um ano", title: "Novo título genérico", body: "Novo apoio", altText: "Novo alt", personalizedMessage: "não pode" } },
    { sceneId: "INF-01", revision: 3, override: { imageUrl: "/welcome.webp", imageOpacity: 2, eyebrow: "Chegada", title: "Você chegou", body: "Novo corpo", altText: "Nova chegada" } },
  ]);

  assert.deepEqual(merged.hero.override, {
    imageUrl: "https://cdn.example/hero.webp",
    mobileImageUrl: "/hero-mobile.webp",
    imageOpacity: 0.64,
  });
  assert.equal(merged.hero.kicker, "Um ano");
  assert.equal(merged.hero.fallbackTitle, "Novo título genérico");
  assert.equal(merged.hero.text, "Novo apoio");
  assert.equal(merged.hero.asset.alt, "Novo alt");
  assert.equal("personalizedMessage" in merged.hero, false);
  assert.deepEqual(merged.scenes[0].override, { imageUrl: "/welcome.webp", imageOpacity: 1 });
  assert.equal(merged.scenes[0].eyebrow, "Chegada");
  assert.equal(merged.scenes[0].title, "Você chegou");
  assert.equal(merged.scenes[0].text, "Novo corpo");
  assert.equal(merged.scenes[0].asset.alt, "Nova chegada");
  assert.equal(base.hero.kicker, "Convite original");
  assert.equal(base.scenes[0].title, "Título");
});

test("movement content override loader returns an empty fallback on API errors or malformed payloads", async () => {
  const offline = await loadMovementContentOverrides("influencer", async () => { throw new Error("offline"); });
  const failed = await loadMovementContentOverrides("partner", async () => ({ ok: false, json: async () => ({}) }));
  const malformed = await loadMovementContentOverrides("partner", async () => ({ ok: true, json: async () => ({ items: "invalid" }) }));
  assert.deepEqual(offline, []);
  assert.deepEqual(failed, []);
  assert.deepEqual(malformed, []);
});

test("movement content overrides preserve the default opacity when the API sends null", () => {
  const merged = applyMovementContentOverrides(base, [
    { sceneId: "INF-01", revision: 1, override: { title: "Novo título", imageOpacity: null } },
  ]);
  assert.equal(merged.scenes[0].title, "Novo título");
  assert.equal("imageOpacity" in merged.scenes[0].override, false);
});

test("movement content override loader requests only the selected audience", async () => {
  const urls = [];
  const items = await loadMovementContentOverrides("partner", async (url) => {
    urls.push(url);
    return { ok: true, json: async () => ({ items: [{ sceneId: "PAR-HERO", override: { body: "Texto" }, revision: 1 }] }) };
  });
  assert.deepEqual(urls, ["/api/movimento-content?audience=partner"]);
  assert.equal(items.length, 1);
});

test("a custom desktop image is also the mobile fallback when no vertical override exists", () => {
  assert.deepEqual(resolveMovementMediaOverride({ imageUrl: "/custom-main.webp", mobileImageUrl: "" }), {
    desktop: "/custom-main.webp",
    mobile: "/custom-main.webp",
    active: true,
  });
  assert.deepEqual(resolveMovementMediaOverride({ imageUrl: "/custom-main.webp", mobileImageUrl: "/custom-mobile.webp" }), {
    desktop: "/custom-main.webp",
    mobile: "/custom-mobile.webp",
    active: true,
  });
});

test("personal hero keeps identity and fixed message in separate hierarchy", async () => {
  const [site, css] = await Promise.all([
    readFile(new URL("../src/movimento/MovementSite.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/movimento/movement.css", import.meta.url), "utf8"),
  ]);
  assert.match(site, /<h1 className="mv-hero-identity">\{identity\}<\/h1>/);
  assert.match(site, /<p className="mv-hero-personal-message">\{fixedCopy\.personalizedMessage\}<\/p>/);
  assert.match(site, /replaceTemplate\(fixedCopy\.responsibleLine, \{ Responsável: responsible \}\)/);
  assert.doesNotMatch(site, /replaceTemplate\(copy\.title/);
  assert.match(site, /const defaults = useMemo\(\(\) => \(\{/);
  assert.match(site, /\}\), \[audience\]\);/);
  assert.match(css, /\.mv-hero-identity\{[^}]*font-size:clamp\(40px,5\.4vw,78px\)/);
  assert.match(css, /\.mv-hero-personal-message\{[^}]*font-size:clamp\(19px,2\.15vw,30px\)/);
  assert.match(css, /\.mv-hero-v2 \.mv-hero-identity\{font-size:clamp\(40px,10\.8vw,54px\)/);
  assert.match(css, /\.mv-hero-v2 \.mv-hero-personal-message\{font-size:clamp\(18px,5\.3vw,24px\)/);
});

test("image intensity applies to the whole picture instead of revealing the LQIP", async () => {
  const [site, css] = await Promise.all([
    readFile(new URL("../src/movimento/MovementSite.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/movimento/movement.css", import.meta.url), "utf8"),
  ]);

  assert.match(site, /"--mv-image-opacity": asset\.override\?\.imageOpacity \?\? 1/);
  assert.match(css, /\.mv-scene-picture\{[^}]*opacity:var\(--mv-image-opacity,1\)/);
  assert.doesNotMatch(css, /\.mv-scene-picture>img\{[^}]*opacity:var\(--mv-image-opacity,1\)/);
});

test("desktop scene grid allows media and copy columns to shrink without overlap", async () => {
  const css = await readFile(new URL("../src/movimento/movement.css", import.meta.url), "utf8");

  assert.match(css, /\.mv-scene-copy\{[^}]*min-width:0/);
  assert.match(css, /\.mv-scene-media\{[^}]*width:100%[^}]*min-width:0/);
  assert.doesNotMatch(css, /\.mv-scene-media\{[^}]*min-height:590px/);
});
