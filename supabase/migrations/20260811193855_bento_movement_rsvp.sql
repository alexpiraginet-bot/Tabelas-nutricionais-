create table if not exists public.movement_invites (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique check (char_length(token_hash) = 64),
  audience_type text not null check (audience_type in ('influencer', 'partner')),
  display_name text not null check (char_length(display_name) between 1 and 120),
  contact text,
  status text not null default 'draft' check (status in ('draft', 'sent', 'responded', 'revoked', 'expired')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists movement_invites_status_expires_idx
  on public.movement_invites (status, expires_at);

create table if not exists public.movement_rsvps (
  id uuid primary key default gen_random_uuid(),
  invite_id uuid not null unique references public.movement_invites(id) on delete cascade,
  response text not null check (response in ('confirmed', 'declined')),
  participation_mode text check (participation_mode in ('training', 'lounge', 'family')),
  shirt_size text check (shirt_size in ('PP', 'P', 'M', 'G', 'GG', 'XGG')),
  training_outfit_size text check (training_outfit_size in ('PP', 'P', 'M', 'G', 'GG', 'XGG')),
  adult_companion_type text check (adult_companion_type in ('husband', 'mother')),
  companion_count smallint not null default 0 check (companion_count between 0 and 2),
  child_count smallint not null default 0 check (child_count between 0 and 1 and child_count <= companion_count),
  child_kit_size text check (child_kit_size is null or char_length(child_kit_size) between 1 and 40),
  privacy_version text not null check (char_length(privacy_version) between 1 and 40),
  image_consent boolean not null default false,
  responded_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint movement_rsvps_shirt_required check (
    (response = 'confirmed' and participation_mode is not null and shirt_size is not null and training_outfit_size is not null)
    or (response = 'declined' and participation_mode is null and shirt_size is null and training_outfit_size is null and adult_companion_type is null and companion_count = 0 and child_count = 0 and child_kit_size is null)
  ),
  constraint movement_rsvps_companion_shape check (
    companion_count = child_count + case when adult_companion_type is null then 0 else 1 end
  ),
  constraint movement_rsvps_family_mode check (
    (participation_mode = 'family' and child_count = 1 and child_kit_size is not null)
    or (participation_mode is distinct from 'family' and child_count = 0 and child_kit_size is null)
  )
);

alter table public.movement_invites enable row level security;
alter table public.movement_rsvps enable row level security;

create table if not exists public.movement_partner_leads (
  id uuid primary key default gen_random_uuid(),
  lead_key text not null unique check (char_length(lead_key) = 64),
  company_name text not null check (char_length(company_name) between 2 and 120),
  contact_name text not null check (char_length(contact_name) between 2 and 120),
  email text not null check (char_length(email) between 3 and 160),
  phone text check (phone is null or char_length(phone) <= 32),
  tier_interest text not null check (tier_interest in ('founding', 'experience', 'kit', 'support', 'custom')),
  contribution_type text not null check (contribution_type in ('financial', 'product', 'service', 'mixed', 'other')),
  contribution_details text check (contribution_details is null or char_length(contribution_details) <= 1200),
  privacy_version text not null check (char_length(privacy_version) between 1 and 40),
  is_binding boolean not null default false check (is_binding = false),
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.movement_partner_leads enable row level security;

revoke all on public.movement_invites, public.movement_rsvps, public.movement_partner_leads from anon, authenticated;
grant select, insert, update on public.movement_invites, public.movement_rsvps, public.movement_partner_leads to service_role;

comment on table public.movement_invites is
  'Private invitations for Bentô em Movimento. Accessed only by server-side service role.';
comment on table public.movement_rsvps is
  'Idempotent Bentô em Movimento attendance responses. No public RLS policies.';
comment on table public.movement_partner_leads is
  'Non-binding Bentô em Movimento sponsor quota interests. Accessed only by server-side service role.';
