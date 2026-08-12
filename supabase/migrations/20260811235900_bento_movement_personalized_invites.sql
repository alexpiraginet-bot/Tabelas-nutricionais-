alter table public.movement_invites
  add column if not exists recipient_name text,
  add column if not exists company_name text,
  add column if not exists opened_at timestamptz,
  add column if not exists revoked_at timestamptz;

alter table public.movement_invites
  drop constraint if exists movement_invites_status_check;

alter table public.movement_invites
  add constraint movement_invites_status_check
  check (status in ('draft', 'sent', 'opened', 'responded', 'revoked', 'expired'));

alter table public.movement_rsvps
  add column if not exists child_age smallint,
  add column if not exists transport_interest boolean not null default false;

alter table public.movement_rsvps
  drop constraint if exists movement_rsvps_child_age_check,
  drop constraint if exists movement_rsvps_child_details,
  drop constraint if exists movement_rsvps_shirt_required,
  drop constraint if exists movement_rsvps_companion_shape,
  drop constraint if exists movement_rsvps_family_mode;

alter table public.movement_rsvps
  add constraint movement_rsvps_child_age_check
  check (child_age is null or child_age between 0 and 120),
  add constraint movement_rsvps_shirt_required check (
    (response = 'confirmed' and shirt_size is not null and training_outfit_size is not null)
    or (response = 'declined' and participation_mode is null and shirt_size is null and training_outfit_size is null and adult_companion_type is null and companion_count = 0 and child_count = 0 and child_kit_size is null and child_age is null and transport_interest = false)
  ),
  add constraint movement_rsvps_companion_shape check (
    companion_count = child_count + case when adult_companion_type is null then 0 else 1 end
  ),
  add constraint movement_rsvps_child_details check (
    (child_count = 1 and child_kit_size is not null)
    or (child_count = 0 and child_kit_size is null and child_age is null)
  );

alter table public.movement_partner_leads
  add column if not exists invite_id uuid;

alter table public.movement_partner_leads
  drop constraint if exists movement_partner_leads_invite_id_fkey,
  drop constraint if exists movement_partner_leads_invite_id_key,
  drop constraint if exists movement_partner_leads_tier_interest_check;

alter table public.movement_partner_leads
  add constraint movement_partner_leads_invite_id_key unique (invite_id),
  add constraint movement_partner_leads_invite_id_fkey
  foreign key (invite_id) references public.movement_invites(id) not valid;

alter table public.movement_partner_leads
  validate constraint movement_partner_leads_invite_id_fkey;

alter table public.movement_partner_leads
  add constraint movement_partner_leads_tier_interest_check
  check (tier_interest in ('select', 'experience', 'signature', 'founding_circle', 'founding', 'kit', 'mobility', 'support', 'custom'));

create index if not exists movement_invites_audience_status_expires_idx
  on public.movement_invites (audience_type, status, expires_at);

create index if not exists movement_rsvps_response_updated_idx
  on public.movement_rsvps (response, updated_at desc);

create index if not exists movement_partner_leads_tier_submitted_idx
  on public.movement_partner_leads (tier_interest, submitted_at desc);

alter table public.movement_invites enable row level security;
alter table public.movement_rsvps enable row level security;
alter table public.movement_partner_leads enable row level security;

revoke all on public.movement_invites, public.movement_rsvps, public.movement_partner_leads from anon, authenticated;
grant select, insert, update on public.movement_invites, public.movement_rsvps, public.movement_partner_leads to service_role;

notify pgrst, 'reload schema';
