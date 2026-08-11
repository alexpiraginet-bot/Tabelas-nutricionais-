import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";

const migrationsDir = new URL("../supabase/migrations/", import.meta.url);

test("movement migrations have unique ordered versions and create tables before extending tiers", async () => {
  const files = (await readdir(migrationsDir))
    .filter((file) => file.includes("bento_movement"))
    .sort();

  assert.deepEqual(files, [
    "20260811193855_bento_movement_rsvp.sql",
    "20260811195316_bento_movement_mobility_tier.sql",
  ]);

  const versions = files.map((file) => file.split("_")[0]);
  assert.equal(new Set(versions).size, versions.length);

  const sql = await Promise.all(files.map((file) => readFile(new URL(file, migrationsDir), "utf8")));
  assert.match(sql[0], /create table if not exists public\.movement_partner_leads/i);
  assert.match(sql[0], /enable row level security/i);
  assert.match(sql[1], /alter table public\.movement_partner_leads/i);
  assert.match(sql[1], /'mobility'/i);
});
