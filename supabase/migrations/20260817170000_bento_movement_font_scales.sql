-- Tamanho de fonte editável pelo painel, por cena e por território.
-- title_scale/body_scale multiplicam o tamanho padrão do código (1 = padrão).
-- A faixa 0.7–1.5 impede tanto texto ilegível quanto título estourando o card.

alter table public.movement_presentation_content
  add column if not exists title_scale numeric,
  add column if not exists body_scale numeric;

alter table public.movement_presentation_content
  drop constraint if exists movement_presentation_content_title_scale_check;

alter table public.movement_presentation_content
  add constraint movement_presentation_content_title_scale_check
    check (title_scale is null or (title_scale >= 0.7 and title_scale <= 1.5));

alter table public.movement_presentation_content
  drop constraint if exists movement_presentation_content_body_scale_check;

alter table public.movement_presentation_content
  add constraint movement_presentation_content_body_scale_check
    check (body_scale is null or (body_scale >= 0.7 and body_scale <= 1.5));

notify pgrst, 'reload schema';
