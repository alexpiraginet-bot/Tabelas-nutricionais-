import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";

const migrationsDir = new URL("../supabase/migrations/", import.meta.url);

test("movement migrations have unique ordered versions and extend personalized invitation data additively", async () => {
  const files = (await readdir(migrationsDir))
    .filter((file) => file.includes("bento_movement"))
    .sort();

  assert.deepEqual(files, [
    "20260811193855_bento_movement_rsvp.sql",
    "20260811195316_bento_movement_mobility_tier.sql",
    "20260812072808_bento_movement_personalized_invites.sql",
  ]);

  const versions = files.map((file) => file.split("_")[0]);
  assert.equal(new Set(versions).size, versions.length);

  const sql = await Promise.all(files.map((file) => readFile(new URL(file, migrationsDir), "utf8")));
  assert.match(sql[0], /create table if not exists public\.movement_partner_leads/i);
  assert.match(sql[0], /enable row level security/i);
  assert.match(sql[1], /alter table public\.movement_partner_leads/i);
  assert.match(sql[1], /'mobility'/i);

  const personalized = sql[2];
  assert.match(personalized, /add column if not exists recipient_name text/i);
  assert.match(personalized, /add column if not exists company_name text/i);
  assert.match(personalized, /add column if not exists opened_at timestamptz/i);
  assert.match(personalized, /add column if not exists revoked_at timestamptz/i);
  assert.match(personalized, /drop constraint if exists movement_invites_status_check/i);
  assert.match(personalized, /add constraint movement_invites_status_check\s+check \(status in \('draft', 'sent', 'opened', 'responded', 'revoked', 'expired'\)\)/i);
  assert.match(personalized, /add column if not exists child_age smallint/i);
  assert.match(personalized, /add column if not exists transport_interest boolean/i);
  assert.match(personalized, /add column if not exists invite_id uuid/i);
  assert.match(personalized, /add constraint movement_partner_leads_invite_id_key unique \(invite_id\)/i);
  assert.match(personalized, /add constraint movement_partner_leads_invite_id_fkey[\s\S]*foreign key \(invite_id\)[\s\S]*not valid/i);
  assert.match(personalized, /validate constraint movement_partner_leads_invite_id_fkey/i);
  assert.match(personalized, /create index if not exists movement_invites_audience_status_expires_idx/i);
  assert.match(personalized, /create index if not exists movement_rsvps_response_updated_idx/i);
  assert.match(personalized, /create index if not exists movement_partner_leads_tier_submitted_idx/i);
  assert.match(personalized, /drop constraint if exists movement_partner_leads_tier_interest_check/i);
  for (const tier of ["select", "experience", "signature", "founding_circle", "founding", "kit", "mobility", "support", "custom"]) {
    assert.match(personalized, new RegExp(`'${tier}'`, "i"));
  }
  assert.match(personalized, /alter table public\.movement_invites enable row level security/i);
  assert.match(personalized, /alter table public\.movement_rsvps enable row level security/i);
  assert.match(personalized, /alter table public\.movement_partner_leads enable row level security/i);
  assert.match(personalized, /revoke all on public\.movement_invites, public\.movement_rsvps, public\.movement_partner_leads from anon, authenticated/i);
  assert.match(personalized, /grant select, insert, update on public\.movement_invites, public\.movement_rsvps, public\.movement_partner_leads to service_role/i);

  for (const constraint of [
    "movement_invites_status_check",
    "movement_rsvps_child_age_check",
    "movement_rsvps_child_details",
    "movement_partner_leads_invite_id_key",
    "movement_partner_leads_invite_id_fkey",
  ]) {
    const drop = personalized.indexOf(`drop constraint if exists ${constraint}`);
    const add = personalized.indexOf(`add constraint ${constraint}`);
    assert.notEqual(drop, -1, `${constraint} must be dropped before it is recreated`);
    assert.ok(add > drop, `${constraint} must be recreated after its drop guard`);
  }
});
