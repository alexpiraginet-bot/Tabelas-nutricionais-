export function parseMovementRoute(pathname) {
  const path = String(pathname || "").replace(/\/+$/, "") || "/";
  if (path === "/movimento") return { mode: "influencer", token: null };
  if (path === "/movimento/parceiros") return { mode: "partner", token: null };
  if (path === "/movimento/convite") return { mode: "invite", token: null };
  if (path.startsWith("/movimento/convite/")) {
    const encoded = path.slice("/movimento/convite/".length);
    try { return { mode: "invite", token: decodeURIComponent(encoded) || null }; }
    catch { return { mode: "invite", token: null }; }
  }
  return null;
}

export function getMovementExperience(mode) {
  if (mode === "partner") {
    return { story: "partner", showPresentation: true, showRsvp: false };
  }
  return {
    story: "influencer",
    showPresentation: true,
    showRsvp: mode === "invite",
  };
}

export function isPersonalMovementMode(mode) {
  return mode === "invite";
}
