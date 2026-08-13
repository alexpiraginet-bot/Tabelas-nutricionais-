import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { INFLUENCER_SCENES, PARTNER_SCENES } from "../src/movimento/movement-content.js";

const editorSource = await readFile(new URL("../public/painel-movimento-editor.js", import.meta.url), "utf8");
const editorCss = await readFile(new URL("../public/painel-movimento-editor.css", import.meta.url), "utf8");

test("editor defaults stay synchronized with every canonical presentation scene", () => {
  const editorScenes = Object.fromEntries([...editorSource.matchAll(/^\s+"((?:INF|PAR)-(?:HERO|\d{2}))": (\[[^\n]+\]),$/gm)].map(([, id, serialized]) => [id, JSON.parse(serialized)]));
  for (const scene of [...INFLUENCER_SCENES, ...PARTNER_SCENES]) {
    assert.deepEqual(editorScenes[scene.assetId], [scene.eyebrow, scene.title, scene.text, scene.alt], `${scene.assetId} default drifted from the presentation`);
  }
});

class FakeStyle {
  constructor() { this.values = new Map(); }
  setProperty(name, value) { this.values.set(name, String(value)); }
  getPropertyValue(name) { return this.values.get(name) || ""; }
}

class FakeElement {
  constructor(document, tagName = "div") {
    this.ownerDocument = document;
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.parentNode = null;
    this.attributes = new Map();
    this.dataset = {};
    this.style = new FakeStyle();
    this.listeners = new Map();
    this.className = "";
    this.hidden = false;
    this.disabled = false;
    this.value = "";
    this.files = [];
    this._textContent = "";
    this.classList = {
      toggle: (name, force) => {
        const names = new Set(this.className.split(/\s+/).filter(Boolean));
        const enabled = force === undefined ? !names.has(name) : Boolean(force);
        if (enabled) names.add(name); else names.delete(name);
        this.className = [...names].join(" ");
      },
    };
  }
  set textContent(value) { this._textContent = String(value ?? ""); this.children = []; }
  get textContent() { return this._textContent + this.children.map((child) => child.textContent || "").join(""); }
  set id(value) { this._id = String(value || ""); }
  get id() { return this._id || ""; }
  setAttribute(name, value) {
    this.attributes.set(name, String(value));
    if (name === "id") this.id = value;
    if (name.startsWith("data-")) this.dataset[name.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = String(value);
  }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  appendChild(child) { child.parentNode = this; this.children.push(child); return child; }
  append(...children) {
    for (const child of children) this.appendChild(typeof child === "string" ? this.ownerDocument.createTextNode(child) : child);
  }
  replaceChildren(...children) { this.children = []; this._textContent = ""; this.append(...children); }
  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) || [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }
  async dispatch(type, extra = {}) {
    if (this.disabled && ["click", "change", "input", "submit"].includes(type)) return;
    const event = { type, target: this, currentTarget: this, key: "", defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, ...extra };
    for (const listener of this.listeners.get(type) || []) await listener(event);
  }
  click() { return this.dispatch("click"); }
  focus() { this.ownerDocument.activeElement = this; }
  contains(node) {
    for (let current = node; current; current = current.parentNode) if (current === this) return true;
    return false;
  }
  get elements() {
    return {
      namedItem: (name) => findAll(this, (node) => node.name === name)[0] || null,
    };
  }
}

class FakeImage extends FakeElement {
  constructor(document, { mode = "load", width = 1200, height = 1600 } = {}) {
    super(document, "img");
    this.mode = mode;
    this.naturalWidth = width;
    this.naturalHeight = height;
    this.width = width;
    this.height = height;
    this._src = "";
  }
  set src(value) {
    this._src = String(value || "");
    if (this.mode === "manual") return;
    queueMicrotask(() => this.dispatch(this.mode));
  }
  get src() { return this._src; }
}

class FakeCanvas extends FakeElement {
  constructor(document, blobFactory) { super(document, "canvas"); this.width = 0; this.height = 0; this.blobFactory = blobFactory; this.drawCalls = []; }
  getContext() { return { drawImage: (...args) => { this.drawCalls.push(args); } }; }
  toBlob(callback, type, quality) { callback(this.blobFactory({ width: this.width, height: this.height, type, quality })); }
}

function findAll(root, predicate, output = []) {
  if (predicate(root)) output.push(root);
  for (const child of root.children || []) findAll(child, predicate, output);
  return output;
}

function jsonResponse(payload, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => payload };
}

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

function manualClock() {
  let nextId = 1;
  const timers = new Map();
  return {
    timers,
    setTimeout(callback) { const id = nextId++; timers.set(id, callback); return id; },
    clearTimeout(id) { timers.delete(id); },
    expireNext() {
      const entry = timers.entries().next().value;
      assert.ok(entry, "expected a pending request timeout");
      timers.delete(entry[0]);
      entry[1]();
    },
  };
}

async function flush() {
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
}

async function waitFor(predicate, message = "condition was not reached") {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (predicate()) return;
    await flush();
  }
  assert.fail(message);
}

function createHarness({
  items = [], fetchImpl, confirm = () => true,
  bitmap = { width: 2400, height: 1200 }, createImageBitmapImpl,
  previewImage = { mode: "load", width: 752, height: 940 },
  fallbackImage = { mode: "load", width: 1200, height: 1600 },
  blobFactory, setTimeoutImpl = setTimeout, clearTimeoutImpl = clearTimeout,
} = {}) {
  const external = [];
  const canvases = [];
  const objectUrls = [];
  const revokedObjectUrls = [];
  const document = {
    readyState: "complete",
    activeElement: null,
    createElement(tagName) {
      if (tagName === "canvas") {
        const canvas = new FakeCanvas(document, blobFactory || (({ width, height, type, quality }) => new Blob([new Uint8Array(Math.max(64, Math.round(width * height * quality * 0.08)))], { type })));
        canvases.push(canvas);
        return canvas;
      }
      if (tagName === "img") return new FakeImage(document, previewImage);
      return new FakeElement(document, tagName);
    },
    createTextNode(text) { const node = new FakeElement(document, "#text"); node._textContent = String(text); return node; },
    getElementById(id) {
      for (const root of external) {
        const found = findAll(root, (node) => node.id === id)[0];
        if (found) return found;
      }
      return null;
    },
    querySelectorAll(selector) {
      if (selector === "[data-mov-admin-tab]") return external.filter((node) => node.dataset.movAdminTab);
      return [];
    },
    addEventListener() {},
  };
  const host = document.createElement("div"); host.id = "movContentPane"; host.hidden = true;
  const invites = document.createElement("div"); invites.id = "movInvitesPane";
  const inviteTab = document.createElement("button"); inviteTab.dataset.movAdminTab = "invites"; inviteTab.className = "on";
  const contentTab = document.createElement("button"); contentTab.dataset.movAdminTab = "content";
  external.push(host, invites, inviteTab, contentTab);

  const requests = [];
  const browserEvents = new Map();
  const fetch = fetchImpl || (async (url, options = {}) => {
    requests.push({ url, options });
    if (String(url).startsWith("/api/movimento-content?fresh=1")) return jsonResponse({ ok: true, items });
    throw new Error(`unexpected request ${url}`);
  });
  const window = {
    confirm,
    location: { origin: "https://bentogelateria.com" },
    addEventListener(type, listener) { browserEvents.set(type, listener); },
    AbortController,
    Image: class extends FakeImage { constructor() { super(document, fallbackImage); } },
    URL: {
      createObjectURL() { const value = `blob:movement-${objectUrls.length + 1}`; objectUrls.push(value); return value; },
      revokeObjectURL(value) { revokedObjectUrls.push(value); },
    },
  };
  if (createImageBitmapImpl !== null) window.createImageBitmap = createImageBitmapImpl || (async () => ({ ...bitmap, close() {} }));
  const context = {
    document,
    window,
    localStorage: { getItem: () => "panel-key" },
    fetch,
    Blob,
    Uint8Array,
    createImageBitmap: window.createImageBitmap,
    URL: window.URL,
    AbortController,
    console,
    setTimeout: setTimeoutImpl,
    clearTimeout: clearTimeoutImpl,
  };
  vm.createContext(context);
  vm.runInContext(editorSource, context);

  return {
    document, host, invites, inviteTab, contentTab, requests, canvases, browserEvents, objectUrls, revokedObjectUrls,
    findById: (id) => document.getElementById(id),
    findByName: (name) => findAll(host, (node) => node.name === name)[0],
    sceneButtons: () => findAll(host, (node) => node.tagName === "BUTTON" && node.className.split(/\s+/).includes("mov-editor-scene")),
    territoryButtons: () => findAll(host, (node) => node.tagName === "BUTTON" && node.className.split(/\s+/).includes("mov-editor-territory")),
  };
}

async function openEditor(harness) {
  await harness.contentTab.click();
  await flush();
}

test("editor renders all 32 scene families and ignores null override fields when applying defaults", async () => {
  const harness = createHarness({ items: [{ audience: "influencer", sceneId: "INF-01", revision: 2, override: { imageUrl: null, mobileImageUrl: null, imageOpacity: null, eyebrow: null, title: "Título salvo", body: null, altText: null } }] });
  await openEditor(harness);
  assert.equal(harness.sceneButtons().length, 15);
  harness.findById("movEditorAudience").value = "partner";
  await harness.findById("movEditorAudience").dispatch("change");
  assert.equal(harness.sceneButtons().length, 17);
  harness.findById("movEditorAudience").value = "influencer";
  await harness.findById("movEditorAudience").dispatch("change");
  await harness.sceneButtons()[1].click();
  assert.equal(harness.findByName("title").value, "Título salvo");
  assert.match(harness.findByName("body").value, /Le Buffet Lounge/);
  assert.equal(harness.findByName("imageOpacity").value, "1");
});

test("editor mirrors the current cover plus five horizontal territories and saves each background independently", async () => {
  const calls = [];
  const harness = createHarness({ fetchImpl: async (url, options = {}) => {
    calls.push({ url, options });
    if (String(url).includes("fresh=1")) return jsonResponse({ ok: true, items: [] });
    const body = JSON.parse(options.body);
    return jsonResponse({ ok: true, item: { audience: body.audience, sceneId: body.sceneId, revision: 1, override: body.override } });
  } });
  await openEditor(harness);

  assert.equal(harness.territoryButtons().length, 6);
  assert.match(harness.territoryButtons()[0].textContent, /Capa/);
  assert.match(harness.territoryButtons()[1].textContent, /Chegada/);
  await harness.territoryButtons()[1].click();
  assert.match(harness.findById("movEditorPreview").className, /is-territory/);
  assert.match(editorCss, /\.mov-editor-preview\.is-territory\{[^}]*aspect-ratio:16\/9/);
  assert.equal(harness.sceneButtons().filter((button) => !button.hidden).length, 2);

  const background = harness.findByName("backgroundColor");
  assert.equal(background.value.toUpperCase(), "#F2EDE4");
  background.value = "#e9e1d3";
  await background.dispatch("input");
  await harness.findById("movEditorForm").dispatch("submit");
  const payload = JSON.parse(calls.find(({ url }) => url === "/api/movimento-content").options.body);
  assert.equal(payload.sceneId, "INF-THEME-ARRIVAL");
  assert.deepEqual(payload.override, { backgroundColor: "#E9E1D3" });
});

test("failed save preserves the live draft and offers an authenticated reload path", async () => {
  const calls = [];
  const harness = createHarness({ fetchImpl: async (url, options = {}) => {
    calls.push({ url, options });
    if (String(url).includes("fresh=1")) return jsonResponse({ ok: true, items: [] });
    return jsonResponse({ ok: false, error: "Este conteúdo foi alterado em outra sessão." }, 409);
  } });
  await openEditor(harness);
  await harness.sceneButtons()[1].click();
  const title = harness.findByName("title");
  title.value = "Minha edição preservada";
  await title.dispatch("input");
  await harness.findById("movEditorForm").dispatch("submit");
  await flush();
  assert.equal(harness.findByName("title").value, "Minha edição preservada");
  assert.match(harness.findById("movEditorStatus").textContent, /outra sessão/i);
  assert.equal(harness.findById("movEditorReload").hidden, false);
  assert.equal(calls.filter(({ url }) => String(url).includes("fresh=1")).length, 1);
});

test("save freezes its target, disables competing controls, and sends the custom-image alt text", async () => {
  const save = deferred();
  const requests = [];
  const customImage = "https://project.supabase.co/storage/v1/object/public/artes/movimento/custom.webp";
  const harness = createHarness({ items: [{ audience: "influencer", sceneId: "INF-01", revision: 3, override: { imageUrl: customImage, mobileImageUrl: null, imageOpacity: null, eyebrow: null, title: null, body: null, altText: null } }], fetchImpl: async (url, options = {}) => {
    requests.push({ url, options });
    if (String(url).includes("fresh=1")) return jsonResponse({ ok: true, items: [{ audience: "influencer", sceneId: "INF-01", revision: 3, override: { imageUrl: customImage, mobileImageUrl: null, imageOpacity: null, eyebrow: null, title: null, body: null, altText: null } }] });
    return save.promise;
  } });
  await openEditor(harness);
  await harness.sceneButtons()[1].click();
  const body = harness.findByName("body"); body.value = "Texto atualizado sem perder a descrição acessível."; await body.dispatch("input");
  const submit = harness.findById("movEditorForm").dispatch("submit");
  await flush();
  assert.equal(harness.findById("movEditorAudience").disabled, true);
  assert.equal(harness.inviteTab.disabled, true);
  assert.equal(harness.contentTab.disabled, true);
  assert.equal(harness.sceneButtons().every((button) => button.disabled), true);
  assert.equal(harness.findById("movEditorRestore").disabled, true);
  const payload = JSON.parse(requests.at(-1).options.body);
  assert.equal(payload.audience, "influencer");
  assert.equal(payload.sceneId, "INF-01");
  assert.equal(payload.revision, 3);
  assert.match(payload.override.altText, /Deck contemporâneo/);
  save.resolve(jsonResponse({ ok: true, item: { audience: "influencer", sceneId: "INF-01", revision: 4, override: payload.override } }));
  await submit;
});

test("restoring a published override always confirms before writing", async () => {
  const confirmations = [];
  const customImage = "https://project.supabase.co/storage/v1/object/public/artes/movimento/original.webp";
  const calls = [];
  const harness = createHarness({ items: [{ audience: "influencer", sceneId: "INF-01", revision: 2, override: { imageUrl: customImage } }], confirm: (message) => { confirmations.push(message); return false; }, fetchImpl: async (url, options = {}) => {
    calls.push({ url, options });
    if (String(url).includes("fresh=1")) return jsonResponse({ ok: true, items: [{ audience: "influencer", sceneId: "INF-01", revision: 2, override: { imageUrl: customImage } }] });
    throw new Error("reset must not run");
  } });
  await openEditor(harness); await harness.sceneButtons()[1].click();
  await harness.findById("movEditorRestore").click();
  assert.equal(confirmations.length, 1);
  assert.match(confirmations[0], /restaurar o padrão/i);
  assert.equal(calls.length, 1);
});

test("confirming a scene change really discards the current uploaded draft", async () => {
  const publicUrl = "https://project.supabase.co/storage/v1/object/public/artes/movimento/discard-me.webp";
  const harness = createHarness({ confirm: () => true, fetchImpl: async (url) => {
    if (String(url).includes("fresh=1")) return jsonResponse({ ok: true, items: [] });
    if (url === "/api/upload") return jsonResponse({ ok: true, uploadUrl: "https://project.supabase.co/upload", publicUrl });
    if (url === "https://project.supabase.co/upload") return jsonResponse({});
    throw new Error(`unexpected ${url}`);
  } });
  await openEditor(harness); await harness.sceneButtons()[1].click();
  const input = findAll(harness.host, (node) => node.dataset.field === "imageUrl")[0];
  input.files = [{ name: "draft.jpg", type: "image/jpeg", size: 3_000_000 }];
  await input.dispatch("change");
  await harness.findById("movCropApply").click();
  await waitFor(() => harness.findById("movEditorPreview").children[0].src === publicUrl, "uploaded draft did not reach preview");
  assert.equal(harness.findById("movEditorPreview").children[0].src, publicUrl);
  await harness.sceneButtons()[2].click();
  await harness.sceneButtons()[1].click();
  assert.notEqual(harness.findById("movEditorPreview").children[0].src, publicUrl);
  const event = { prevented: false, preventDefault() { this.prevented = true; }, returnValue: undefined };
  harness.browserEvents.get("beforeunload")(event);
  assert.equal(event.prevented, false);
});

test("selecting a photo opens a crop optimizer and applies focal position before uploading", async () => {
  const calls = [];
  const uploadUrl = "https://project.supabase.co/storage/v1/upload/signed";
  const publicUrl = "https://project.supabase.co/storage/v1/object/public/artes/movimento/cropped.webp";
  const harness = createHarness({ fetchImpl: async (url, options = {}) => {
    calls.push({ url, options });
    if (String(url).includes("fresh=1")) return jsonResponse({ ok: true, items: [] });
    if (url === "/api/upload") return jsonResponse({ ok: true, uploadUrl, publicUrl });
    if (url === uploadUrl) return jsonResponse({}, 200);
    throw new Error(`unexpected ${url}`);
  } });
  await openEditor(harness); await harness.sceneButtons()[1].click();
  const input = findAll(harness.host, (node) => node.dataset.field === "imageUrl")[0];
  input.files = [{ name: "foto-wide.jpg", type: "image/jpeg", size: 8_000_000 }];
  await input.dispatch("change");

  const dialog = harness.findById("movImageCropDialog");
  assert.equal(dialog.hidden, false);
  assert.match(dialog.textContent, /Ajuste e otimize/i);
  assert.equal(calls.filter(({ url }) => url === "/api/upload").length, 0);
  assert.deepEqual([harness.canvases[0].width, harness.canvases[0].height], [1080, 675]);

  const horizontal = harness.findByName("cropX");
  horizontal.value = "100";
  await horizontal.dispatch("input");
  const draw = harness.canvases[0].drawCalls.at(-1);
  assert.deepEqual(draw.slice(1), [480, 0, 1920, 1200, 0, 0, 1080, 675]);

  await harness.findById("movCropApply").click();
  await waitFor(() => calls.some(({ url }) => url === uploadUrl), "cropped image was not uploaded");
  assert.equal(harness.findById("movEditorPreview").children[0].src, publicUrl);
  const signPayload = JSON.parse(calls.find(({ url }) => url === "/api/upload").options.body);
  assert.match(signPayload.name, /-desktop\.webp$/);
  assert.ok(signPayload.size < input.files[0].size);
});

test("applying a crop publishes the uploaded image without requiring a second save", async () => {
  const calls = [];
  const uploadUrl = "https://project.supabase.co/storage/v1/upload/signed";
  const publicUrl = "https://project.supabase.co/storage/v1/object/public/artes/movimento/published.webp";
  const harness = createHarness({ fetchImpl: async (url, options = {}) => {
    calls.push({ url, options });
    if (String(url).includes("fresh=1")) return jsonResponse({ ok: true, items: [] });
    if (url === "/api/upload") return jsonResponse({ ok: true, uploadUrl, publicUrl });
    if (url === uploadUrl) return jsonResponse({}, 200);
    if (url === "/api/movimento-content") {
      const body = JSON.parse(options.body);
      return jsonResponse({ ok: true, item: { audience: body.audience, sceneId: body.sceneId, revision: 1, override: body.override } });
    }
    throw new Error(`unexpected ${url}`);
  } });
  await openEditor(harness);
  const input = harness.findByName("imageUrl");
  input.files = [{ name: "hero.jpg", type: "image/jpeg", size: 4_000_000 }];
  await input.dispatch("change");
  await harness.findById("movCropApply").click();
  await waitFor(() => calls.some(({ url }) => url === "/api/movimento-content"), "uploaded crop was not published");

  const saveCall = calls.find(({ url }) => url === "/api/movimento-content");
  const payload = JSON.parse(saveCall.options.body);
  assert.equal(payload.sceneId, "INF-HERO");
  assert.equal(payload.override.imageUrl, publicUrl);
  assert.match(harness.findById("movEditorStatus").textContent, /salva e publicada/i);
  assert.equal(harness.findById("movEditorSave").disabled, false);
  const event = { prevented: false, preventDefault() { this.prevented = true; }, returnValue: undefined };
  harness.browserEvents.get("beforeunload")(event);
  assert.equal(event.prevented, false);
});

test("crop auto-publish waits for the public preview and does not publish unrelated text drafts", async () => {
  const calls = [];
  const uploadUrl = "https://project.supabase.co/storage/v1/upload/signed";
  const publicUrl = "https://project.supabase.co/storage/v1/object/public/artes/movimento/previewed.webp";
  const harness = createHarness({ previewImage: { mode: "manual", width: 752, height: 940 }, fetchImpl: async (url, options = {}) => {
    calls.push({ url, options });
    if (String(url).includes("fresh=1")) return jsonResponse({ ok: true, items: [] });
    if (url === "/api/upload") return jsonResponse({ ok: true, uploadUrl, publicUrl });
    if (url === uploadUrl) return jsonResponse({}, 200);
    if (url === "/api/movimento-content") {
      const body = JSON.parse(options.body);
      return jsonResponse({ ok: true, item: { audience: body.audience, sceneId: body.sceneId, revision: 1, override: body.override } });
    }
    throw new Error(`unexpected ${url}`);
  } });
  await openEditor(harness);
  await harness.findById("movEditorPreview").children[0].dispatch("load");
  const title = harness.findByName("title"); title.value = "Rascunho ainda não publicado"; await title.dispatch("input");
  const input = harness.findByName("imageUrl"); input.files = [{ name: "hero.jpg", type: "image/jpeg", size: 4_000_000 }];
  await input.dispatch("change");
  const applying = harness.findById("movCropApply").click();
  await waitFor(() => harness.findById("movEditorPreview").children[0].src === publicUrl, "public preview did not receive the uploaded URL");
  assert.equal(calls.filter(({ url }) => url === "/api/movimento-content").length, 0);
  await harness.findById("movEditorPreview").children[0].dispatch("load");
  await applying;

  const payload = JSON.parse(calls.find(({ url }) => url === "/api/movimento-content").options.body);
  assert.equal(payload.override.imageUrl, publicUrl);
  assert.equal(payload.override.altText, "Grupo de convidadas chegando em roupa de treino ao lounge contemporâneo junto ao canal urbano de Vitória");
  assert.equal(Object.hasOwn(payload.override, "title"), false);
  assert.equal(harness.findByName("title").value, "Rascunho ainda não publicado");
  assert.match(harness.findById("movEditorStatus").textContent, /outras alterações continuam como rascunho/i);
});

test("desktop crop temporarily previews its own URL and keeps the target locked when a mobile override exists", async () => {
  const calls = [];
  const uploadUrl = "https://project.supabase.co/storage/v1/upload/signed";
  const publicUrl = "https://project.supabase.co/storage/v1/object/public/artes/movimento/new-desktop.webp";
  const previousMobile = "https://project.supabase.co/storage/v1/object/public/artes/movimento/previous-mobile.webp";
  const items = [{ audience: "influencer", sceneId: "INF-HERO", revision: 2, override: { imageUrl: null, mobileImageUrl: previousMobile, altText: "Descrição acessível da capa já publicada" } }];
  const harness = createHarness({ items, previewImage: { mode: "manual", width: 752, height: 940 }, fetchImpl: async (url, options = {}) => {
    calls.push({ url, options });
    if (String(url).includes("fresh=1")) return jsonResponse({ ok: true, items });
    if (url === "/api/upload") return jsonResponse({ ok: true, uploadUrl, publicUrl });
    if (url === uploadUrl) return jsonResponse({}, 200);
    if (url === "/api/movimento-content") {
      const body = JSON.parse(options.body);
      return jsonResponse({ ok: true, item: { audience: body.audience, sceneId: body.sceneId, revision: 3, override: { ...items[0].override, ...body.override } } });
    }
    throw new Error(`unexpected ${url}`);
  } });
  await openEditor(harness); await harness.findById("movEditorPreview").children[0].dispatch("load");
  const input = harness.findByName("imageUrl"); input.files = [{ name: "desktop.jpg", type: "image/jpeg", size: 4_000_000 }];
  await input.dispatch("change");
  const applying = harness.findById("movCropApply").click();
  await waitFor(() => harness.findById("movEditorPreview").children[0].src === publicUrl, "desktop upload did not become the temporary preview");
  assert.equal(harness.findById("movEditorAudience").disabled, true);
  assert.equal(harness.sceneButtons().every((button) => button.disabled), true);
  assert.equal(harness.contentTab.disabled, true);
  await harness.findById("movEditorPreview").children[0].dispatch("load");
  await applying;
  const payload = JSON.parse(calls.find(({ url }) => url === "/api/movimento-content").options.body);
  assert.equal(payload.revision, 2);
  assert.equal(payload.override.imageUrl, publicUrl);
  assert.equal(Object.hasOwn(payload.override, "mobileImageUrl"), false);
});

test("upload optimizes deterministically before signing and retains its originating scene", async () => {
  const calls = [];
  const uploadUrl = "https://project.supabase.co/storage/v1/upload/signed";
  const publicUrl = "https://project.supabase.co/storage/v1/object/public/artes/movimento/optimized.webp";
  const signing = deferred();
  const harness = createHarness({ fetchImpl: async (url, options = {}) => {
    calls.push({ url, options });
    if (String(url).includes("fresh=1")) return jsonResponse({ ok: true, items: [] });
    if (url === "/api/upload") return signing.promise;
    if (url === uploadUrl) return jsonResponse({}, 200);
    throw new Error(`unexpected ${url}`);
  } });
  await openEditor(harness); await harness.sceneButtons()[1].click();
  const file = { name: "Foto enorme.JPG", type: "image/jpeg", size: 10 * 1024 * 1024 };
  const input = findAll(harness.host, (node) => node.dataset.field === "imageUrl")[0]; input.files = [file];
  const upload = input.dispatch("change");
  await upload;
  const applying = harness.findById("movCropApply").click();
  await waitFor(() => calls.some(({ url }) => url === "/api/upload"), "optimized upload was not signed");
  assert.equal(harness.findById("movEditorAudience").disabled, true);
  assert.equal(harness.sceneButtons().every((button) => button.disabled), true);
  signing.resolve(jsonResponse({ ok: true, uploadUrl, publicUrl }));
  await applying; await flush();
  const sign = calls.find(({ url }) => url === "/api/upload");
  const payload = JSON.parse(sign.options.body);
  assert.equal(payload.type, "image/webp");
  assert.match(payload.name, /-desktop\.webp$/);
  assert.ok(payload.size < file.size);
  assert.deepEqual([harness.canvases[0].width, harness.canvases[0].height], [1080, 675]);
  assert.equal(calls.find(({ url }) => url === uploadUrl).options.body.type, "image/webp");
  assert.equal(harness.findById("movEditorPreview").children[0].src, publicUrl);
});

test("upload falls back to an HTML image and revokes its object URL when createImageBitmap is unavailable", async () => {
  const uploadUrl = "https://project.supabase.co/storage/v1/upload/signed";
  const publicUrl = "https://project.supabase.co/storage/v1/object/public/artes/movimento/fallback.webp";
  const harness = createHarness({ createImageBitmapImpl: null, fetchImpl: async (url) => {
    if (String(url).includes("fresh=1")) return jsonResponse({ ok: true, items: [] });
    if (url === "/api/upload") return jsonResponse({ ok: true, uploadUrl, publicUrl });
    if (url === uploadUrl) return jsonResponse({}, 200);
    throw new Error(`unexpected ${url}`);
  } });
  await openEditor(harness);
  const input = findAll(harness.host, (node) => node.dataset.field === "imageUrl")[0];
  input.files = [{ name: "foto-iphone.jpg", type: "image/jpeg", size: 4_000_000 }];
  await input.dispatch("change");
  await harness.findById("movCropApply").click();
  await flush();
  assert.equal(harness.findById("movEditorPreview").children[0].src, publicUrl);
  assert.deepEqual(harness.revokedObjectUrls, harness.objectUrls);
  assert.equal(harness.objectUrls.length, 1);
});

test("upload uses the HTML image fallback when createImageBitmap rejects", async () => {
  const uploadUrl = "https://project.supabase.co/storage/v1/upload/signed";
  const publicUrl = "https://project.supabase.co/storage/v1/object/public/artes/movimento/recovered.webp";
  const harness = createHarness({ createImageBitmapImpl: async () => { throw new Error("bitmap decode failed"); }, fetchImpl: async (url) => {
    if (String(url).includes("fresh=1")) return jsonResponse({ ok: true, items: [] });
    if (url === "/api/upload") return jsonResponse({ ok: true, uploadUrl, publicUrl });
    if (url === uploadUrl) return jsonResponse({}, 200);
    throw new Error(`unexpected ${url}`);
  } });
  await openEditor(harness);
  const input = findAll(harness.host, (node) => node.dataset.field === "mobileImageUrl")[0];
  input.files = [{ name: "vertical.jpg", type: "image/jpeg", size: 4_000_000 }];
  await input.dispatch("change");
  await harness.findById("movCropApply").click();
  await flush();
  assert.equal(harness.findById("movEditorPreview").children[0].src, publicUrl);
  assert.deepEqual(harness.revokedObjectUrls, harness.objectUrls);
});

test("a timed-out initial load unlocks the editor and offers recovery", async () => {
  const clock = manualClock();
  const pending = deferred();
  const harness = createHarness({
    fetchImpl: async () => pending.promise,
    setTimeoutImpl: clock.setTimeout,
    clearTimeoutImpl: clock.clearTimeout,
  });
  await harness.contentTab.click();
  await flush();
  clock.expireNext();
  await flush();
  assert.match(harness.findById("movEditorStatus").textContent, /demorou/i);
  assert.equal(harness.findById("movEditorReload").hidden, false);
  assert.equal(harness.findById("movEditorAudience").disabled, false);
});

test("a timed-out save preserves the draft and restores usable controls", async () => {
  const clock = manualClock();
  let saveSignal;
  const harness = createHarness({
    fetchImpl: async (url, options = {}) => {
      if (String(url).includes("fresh=1")) return jsonResponse({ ok: true, items: [] });
      saveSignal = options.signal;
      return new Promise((_, reject) => options.signal.addEventListener("abort", () => reject(new Error("raw abort")), { once: true }));
    },
    setTimeoutImpl: clock.setTimeout,
    clearTimeoutImpl: clock.clearTimeout,
  });
  await openEditor(harness);
  const title = harness.findByName("title"); title.value = "Rascunho preservado no timeout"; await title.dispatch("input");
  const saving = harness.findById("movEditorForm").dispatch("submit");
  await flush();
  clock.expireNext();
  await saving;
  assert.equal(saveSignal.aborted, true);
  assert.match(harness.findById("movEditorStatus").textContent, /demorou/i);
  assert.equal(harness.findByName("title").value, "Rascunho preservado no timeout");
  assert.equal(harness.findById("movEditorSave").disabled, false);
});

test("timeouts cover both upload signing and the signed PUT without losing the draft", async (t) => {
  for (const stalledStage of ["sign", "put"]) {
    await t.test(stalledStage, async () => {
      const clock = manualClock();
      const pending = deferred();
      const uploadUrl = "https://project.supabase.co/storage/v1/upload/signed";
      const harness = createHarness({
        fetchImpl: async (url) => {
          if (String(url).includes("fresh=1")) return jsonResponse({ ok: true, items: [] });
          if (url === "/api/upload") return stalledStage === "sign" ? pending.promise : jsonResponse({ ok: true, uploadUrl, publicUrl: "https://project.supabase.co/storage/v1/object/public/artes/movimento/new.webp" });
          if (url === uploadUrl) return pending.promise;
          throw new Error(`unexpected ${url}`);
        },
        setTimeoutImpl: clock.setTimeout,
        clearTimeoutImpl: clock.clearTimeout,
      });
      await openEditor(harness);
      const body = harness.findByName("body"); body.value = `Rascunho ${stalledStage}`; await body.dispatch("input");
      const input = findAll(harness.host, (node) => node.dataset.field === "imageUrl")[0];
      input.files = [{ name: "foto.jpg", type: "image/jpeg", size: 4_000_000 }];
      await input.dispatch("change");
      const uploading = harness.findById("movCropApply").click(); await flush();
      clock.expireNext();
      await uploading;
      assert.match(harness.findById("movEditorStatus").textContent, /demorou/i);
      assert.equal(harness.findByName("body").value, `Rascunho ${stalledStage}`);
      assert.equal(harness.findById("movEditorAudience").disabled, false);
    });
  }
});

test("a timed-out reset keeps the unsaved draft available", async () => {
  const clock = manualClock();
  const pending = deferred();
  const item = { audience: "influencer", sceneId: "INF-HERO", revision: 2, override: { title: "Publicado" } };
  const harness = createHarness({
    items: [item],
    fetchImpl: async (url) => String(url).includes("fresh=1") ? jsonResponse({ ok: true, items: [item] }) : pending.promise,
    setTimeoutImpl: clock.setTimeout,
    clearTimeoutImpl: clock.clearTimeout,
  });
  await openEditor(harness);
  const title = harness.findByName("title"); title.value = "Rascunho antes de restaurar"; await title.dispatch("input");
  const resetting = harness.findById("movEditorRestore").click();
  await flush();
  clock.expireNext();
  await resetting;
  assert.match(harness.findById("movEditorStatus").textContent, /demorou/i);
  assert.equal(harness.findByName("title").value, "Rascunho antes de restaurar");
  assert.equal(harness.findById("movEditorRestore").disabled, false);
});

test("a failed preview blocks save until the same media loads successfully", async () => {
  const harness = createHarness({ previewImage: { mode: "manual", width: 752, height: 940 } });
  await openEditor(harness);
  const previewImage = harness.findById("movEditorPreview").children[0];
  await previewImage.dispatch("error");
  assert.match(harness.findById("movEditorStatus").textContent, /carregar a imagem/i);
  assert.equal(harness.findById("movEditorSave").disabled, true);
  assert.match(harness.findById("movEditorPreview").className, /error/);
  await previewImage.dispatch("load");
  assert.equal(harness.findById("movEditorSave").disabled, false);
  assert.doesNotMatch(harness.findById("movEditorPreview").className, /error/);
});

test("hero preview uses an iPhone viewport ratio while macro territories use the horizontal deck ratio", async () => {
  const harness = createHarness();
  await openEditor(harness);
  assert.match(harness.findById("movEditorPreview").className, /is-hero/);
  await harness.territoryButtons()[1].click();
  assert.match(harness.findById("movEditorPreview").className, /is-territory/);
  assert.match(editorCss, /\.mov-editor-preview\.is-hero\{aspect-ratio:390\/844\}/);
  assert.match(editorCss, /\.mov-editor-preview\.is-territory\{[^}]*aspect-ratio:16\/9/);
});

test("save restores focus to the replacement action after asynchronous re-render", async () => {
  const harness = createHarness({ fetchImpl: async (url, options = {}) => {
    if (String(url).includes("fresh=1")) return jsonResponse({ ok: true, items: [] });
    const body = JSON.parse(options.body);
    return jsonResponse({ ok: true, item: { audience: body.audience, sceneId: body.sceneId, revision: 1, override: body.override } });
  } });
  await openEditor(harness);
  const title = harness.findByName("title"); title.value = "Título com foco estável"; await title.dispatch("input");
  const originalSave = harness.findById("movEditorSave"); originalSave.focus();
  await harness.findById("movEditorForm").dispatch("submit");
  await flush();
  const replacementSave = harness.findById("movEditorSave");
  assert.notEqual(replacementSave, originalSave);
  assert.equal(harness.document.activeElement, replacementSave);
});

test("crop workflow moves focus into the dialog and restores it to the replacement file control", async () => {
  const uploadUrl = "https://project.supabase.co/storage/v1/upload/signed";
  const harness = createHarness({ fetchImpl: async (url, options = {}) => {
    if (String(url).includes("fresh=1")) return jsonResponse({ ok: true, items: [] });
    if (url === "/api/upload") return jsonResponse({ ok: true, uploadUrl, publicUrl: "https://project.supabase.co/storage/v1/object/public/artes/movimento/focus.webp" });
    if (url === uploadUrl) return jsonResponse({}, 200);
    if (url === "/api/movimento-content") {
      const body = JSON.parse(options.body);
      return jsonResponse({ ok: true, item: { audience: body.audience, sceneId: body.sceneId, revision: 1, override: body.override } });
    }
    throw new Error(`unexpected ${url}`);
  } });
  await openEditor(harness);
  const originalInput = harness.findByName("imageUrl"); originalInput.focus();
  originalInput.files = [{ name: "focus.jpg", type: "image/jpeg", size: 4_000_000 }];
  await originalInput.dispatch("change");
  assert.equal(harness.document.activeElement, harness.findById("movCropApply"));
  await harness.findById("movCropApply").click();
  await flush();
  const replacementInput = harness.findByName("imageUrl");
  assert.notEqual(replacementInput, originalInput);
  assert.ok(harness.document.activeElement === replacementInput, "focus should return to the live file input");
});

test("preview shows full hero hierarchy and tabs support roving arrow-key navigation", async () => {
  const harness = createHarness();
  harness.inviteTab.focus();
  await harness.inviteTab.dispatch("keydown", { key: "ArrowRight" });
  await flush();
  assert.equal(harness.document.activeElement, harness.contentTab);
  assert.equal(harness.contentTab.getAttribute("aria-selected"), "true");
  assert.equal(harness.contentTab.getAttribute("tabindex"), "0");
  assert.equal(harness.inviteTab.getAttribute("tabindex"), "-1");
  const preview = harness.findById("movEditorPreview");
  assert.match(preview.textContent, /Nome da convidada/);
  assert.match(preview.textContent, /Esta celebração tem um lugar/);
  assert.match(preview.textContent, /40–50 pessoas/);
});
