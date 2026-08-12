alter table public.movement_invites
  add column if not exists resend_token_ciphertext text;

alter table public.movement_invites
  drop constraint if exists movement_invites_resend_token_ciphertext_check;

alter table public.movement_invites
  add constraint movement_invites_resend_token_ciphertext_check
  check (resend_token_ciphertext is null or char_length(resend_token_ciphertext) between 40 and 1024);

comment on column public.movement_invites.resend_token_ciphertext is
  'AES-256-GCM encrypted raw token for authenticated panel resend. Legacy rows remain null.';

alter table public.movement_invites enable row level security;
revoke all on public.movement_invites from anon, authenticated;
grant select, insert, update on public.movement_invites to service_role;

notify pgrst, 'reload schema';
