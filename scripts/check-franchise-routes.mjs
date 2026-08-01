import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const config = JSON.parse(
  await readFile(new URL("../vercel.json", import.meta.url), "utf8"),
);

const routes = config.rewrites ?? [];
const franchiseRoute = routes.find((route) => route.source === "/franqueados");
const architectureRoute = routes.find(
  (route) => route.source === "/arquitetura/:path*",
);
const spaFallbackIndex = routes.findIndex(
  (route) => route.destination === "/index.html",
);
const architectureRouteIndex = routes.indexOf(architectureRoute);

assert.equal(
  franchiseRoute?.destination,
  "https://bento-franquiados.vercel.app",
  "The branded franchise route must keep using the dedicated site",
);
assert.equal(
  architectureRoute?.destination,
  "https://bento-franquiados.vercel.app/architecture/:path*",
  "Architecture downloads must proxy to the dedicated site artifact",
);
assert.ok(
  architectureRouteIndex >= 0 && architectureRouteIndex < spaFallbackIndex,
  "Architecture downloads must be resolved before the SPA fallback",
);

console.log("Franchise and architecture routes are ordered and valid.");
