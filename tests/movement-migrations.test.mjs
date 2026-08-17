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
    "20260812130452_bento_movement_content.sql",
    "20260812131439_bento_movement_content_function_search_path.sql",
    "20260812151801_bento_movement_invite_resend.sql",
    "20260812164902_bento_movement_invite_aliases.sql",
    "20260813184310_bento_movement_territory_backgrounds.sql",
    "20260817170000_bento_movement_font_scales.sql",
  ]);

  const versions = files.map((file) => file.split("_")[0]);
  assert.equal(new Set(versions).size, versions.length);

  const sql = await Promise.all(files.map((file) => readFile(new URL(file, migrationsDir), "utf8")));
  assert.match(sql[0], /create table if not exists public\.movement_partner_leads/i);
  assert.match(sql[0], /enable row level security/i);
  assert.match(sql[1], /alter table public\.movement_partner_leads/i);
  assert.match(sql[1], /'mobility'/i);

  const personalized = sql[2];
  const content = sql[3];
  const resend = sql[5];
  const aliases = sql[6];
  const territoryBackgrounds = sql[7];
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

  assert.match(content, /create table if not exists public\.movement_presentation_content/i);
  assert.match(content, /primary key \(audience_type, scene_id\)/i);
  assert.match(content, /audience_type in \('influencer', 'partner'\)/i);
  for (const sceneId of ["INF-HERO", "INF-14", "PAR-HERO", "PAR-16"]) assert.match(content, new RegExp(`'${sceneId}'`));
  assert.match(content, /image_opacity is null or image_opacity between 0 and 1/i);
  assert.match(content, /char_length\(alt_text\) between 24 and 240/i);
  assert.match(content, /\(image_url is null and mobile_image_url is null\)[\s\S]*or \(alt_text is not null and char_length\(alt_text\) between 24 and 240\)/i);
  assert.match(content, /revision >= 1/i);
  assert.match(content, /enable row level security/i);
  assert.match(content, /revoke all on public\.movement_presentation_content from anon, authenticated/i);
  assert.match(content, /grant select, insert, update, delete on public\.movement_presentation_content to service_role/i);
  assert.match(content, /revoke all on function public\.set_movement_presentation_content_updated_at\(\) from public, anon, authenticated/i);
  assert.match(content, /grant execute on function public\.set_movement_presentation_content_updated_at\(\) to service_role/i);

  assert.match(resend, /alter table public\.movement_invites/i);
  assert.match(resend, /add column if not exists resend_token_ciphertext text/i);
  assert.match(resend, /check \(resend_token_ciphertext is null or char_length\(resend_token_ciphertext\) between 40 and 1024\)/i);
  assert.match(resend, /comment on column public\.movement_invites\.resend_token_ciphertext/i);
  assert.match(resend, /alter table public\.movement_invites enable row level security/i);
  assert.match(resend, /revoke all on public\.movement_invites from anon, authenticated/i);
  assert.match(resend, /grant select, insert, update on public\.movement_invites to service_role/i);
  assert.match(aliases, /create table if not exists public\.movement_invite_aliases/i);
  assert.match(aliases, /invite_id uuid not null unique references public\.movement_invites\(id\) on delete cascade/i);
  assert.match(aliases, /token_hash text primary key/i);
  assert.match(aliases, /resend_token_ciphertext text not null/i);
  assert.match(aliases, /enable row level security/i);
  assert.match(aliases, /revoke all on public\.movement_invite_aliases from anon, authenticated/i);
  assert.match(aliases, /grant select, insert, update on public\.movement_invite_aliases to service_role/i);
  assert.match(territoryBackgrounds, /add column if not exists background_color text/i);
  for (const theme of ["INF-THEME-ARRIVAL", "INF-THEME-CREATION", "PAR-THEME-ARRIVAL", "PAR-THEME-CREATION"]) {
    assert.match(territoryBackgrounds, new RegExp(`'${theme}'`));
  }
  assert.match(territoryBackgrounds, /drop constraint if exists movement_presentation_content_background_color_check/i);
  assert.match(territoryBackgrounds, /background_color is null or background_color ~ '\^#\[0-9A-Fa-f\]\{6\}\$'/i);
});
