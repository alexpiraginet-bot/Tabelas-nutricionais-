alter table public.movement_partner_leads
  drop constraint if exists movement_partner_leads_tier_interest_check;

alter table public.movement_partner_leads
  add constraint movement_partner_leads_tier_interest_check
  check (tier_interest in ('founding', 'experience', 'kit', 'mobility', 'support', 'custom'));

comment on constraint movement_partner_leads_tier_interest_check on public.movement_partner_leads is
  'Non-binding Bentô em Movimento sponsorship quota interests, including premium mobility.';

notify pgrst, 'reload schema';
