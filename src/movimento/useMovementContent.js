import { useEffect, useState } from "react";

const ALLOWED_AUDIENCES = new Set(["influencer", "partner"]);
const TEXT_LIMIT = 1200;

function editableText(value) {
  return typeof value === "string" ? value.trim().slice(0, TEXT_LIMIT) : undefined;
}

function editableImageUrl(value) {
  if (typeof value !== "string") return undefined;
  const url = value.trim();
  return url.startsWith("/") || url.startsWith("https://") ? url.slice(0, 2048) : undefined;
}

export function resolveMovementMediaOverride(value, failed = false) {
  if (failed) return { desktop: "", mobile: "", active: false };
  const source = value && typeof value === "object" ? value : {};
  const desktop = editableImageUrl(source.imageUrl) || "";
  const explicitMobile = editableImageUrl(source.mobileImageUrl) || "";
  return {
    desktop,
    mobile: explicitMobile || desktop,
    active: Boolean(desktop || explicitMobile),
  };
}

function normalizeOverride(value) {
  const source = value && typeof value === "object" ? value : {};
  const imageOpacity = source.imageOpacity === null || source.imageOpacity === undefined || source.imageOpacity === ""
    ? Number.NaN
    : Number(source.imageOpacity);
  return {
    imageUrl: editableImageUrl(source.imageUrl),
    mobileImageUrl: editableImageUrl(source.mobileImageUrl),
    imageOpacity: Number.isFinite(imageOpacity) ? Math.min(1, Math.max(0, imageOpacity)) : undefined,
    eyebrow: editableText(source.eyebrow),
    title: editableText(source.title),
    body: editableText(source.body),
    altText: editableText(source.altText),
  };
}

function latestOverrides(items) {
  const byScene = new Map();
  for (const item of Array.isArray(items) ? items : []) {
    if (!item || typeof item.sceneId !== "string") continue;
    const previous = byScene.get(item.sceneId);
    const revision = Number.isFinite(Number(item.revision)) ? Number(item.revision) : 0;
    if (!previous || revision >= previous.revision) byScene.set(item.sceneId, { revision, override: normalizeOverride(item.override) });
  }
  return byScene;
}

function mergeEntry(entry, override, hero = false) {
  if (!override) return entry;
  const mediaOverride = Object.fromEntries(Object.entries({
    imageUrl: override.imageUrl,
    mobileImageUrl: override.mobileImageUrl,
    imageOpacity: override.imageOpacity,
  }).filter(([, value]) => value !== undefined));
  const alt = override.altText === undefined ? entry.asset.alt : override.altText;
  return {
    ...entry,
    ...(hero
      ? {
          kicker: override.eyebrow === undefined ? entry.kicker : override.eyebrow,
          fallbackTitle: override.title === undefined ? entry.fallbackTitle : override.title,
        }
      : {
          eyebrow: override.eyebrow === undefined ? entry.eyebrow : override.eyebrow,
          title: override.title === undefined ? entry.title : override.title,
        }),
    text: override.body === undefined ? entry.text : override.body,
    alt,
    asset: { ...entry.asset, alt },
    override: mediaOverride,
  };
}

export function applyMovementContentOverrides(defaults, items) {
  const overrides = latestOverrides(items);
  return {
    hero: mergeEntry(defaults.hero, overrides.get(defaults.hero.asset.id)?.override, true),
    scenes: defaults.scenes.map((scene) => mergeEntry(scene, overrides.get(scene.assetId)?.override)),
  };
}

export async function loadMovementContentOverrides(audience, fetchImpl = fetch) {
  if (!ALLOWED_AUDIENCES.has(audience)) return [];
  try {
    const response = await fetchImpl(`/api/movimento-content?audience=${audience}`, { headers: { Accept: "application/json" } });
    if (!response.ok) return [];
    const body = await response.json();
    return Array.isArray(body?.items) ? body.items : [];
  } catch {
    return [];
  }
}

export function useMovementContent(audience, defaults) {
  const [content, setContent] = useState(defaults);
  useEffect(() => {
    let active = true;
    setContent(defaults);
    loadMovementContentOverrides(audience).then((items) => {
      if (active) setContent(applyMovementContentOverrides(defaults, items));
    });
    return () => { active = false; };
  }, [audience, defaults]);
  return content;
}
