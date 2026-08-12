create table if not exists public.movement_invite_aliases (
  token_hash text primary key,
  invite_id uuid not null unique references public.movement_invites(id) on delete cascade,
  resend_token_ciphertext text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint movement_invite_aliases_token_hash_check
    check (token_hash ~ '^[0-9a-f]{64}$'),
  constraint movement_invite_aliases_resend_token_ciphertext_check
    check (char_length(resend_token_ciphertext) between 40 and 1024)
);

alter table public.movement_invite_aliases enable row level security;
revoke all on public.movement_invite_aliases from anon, authenticated;
grant select, insert, update on public.movement_invite_aliases to service_role;

notify pgrst, 'reload schema';
