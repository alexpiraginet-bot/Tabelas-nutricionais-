create table if not exists public.movement_presentation_content (
  audience_type text not null,
  scene_id text not null,
  image_url text,
  mobile_image_url text,
  image_opacity numeric,
  eyebrow text,
  title text,
  body text,
  alt_text text,
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (audience_type, scene_id),
  constraint movement_presentation_content_audience_type_check
    check (audience_type in ('influencer', 'partner')),
  constraint movement_presentation_content_scene_check
    check (
      (audience_type = 'influencer' and scene_id in ('INF-HERO', 'INF-01', 'INF-02', 'INF-03', 'INF-04', 'INF-05', 'INF-06', 'INF-07', 'INF-08', 'INF-09', 'INF-10', 'INF-11', 'INF-12', 'INF-13', 'INF-14'))
      or (audience_type = 'partner' and scene_id in ('PAR-HERO', 'PAR-01', 'PAR-02', 'PAR-03', 'PAR-04', 'PAR-05', 'PAR-06', 'PAR-07', 'PAR-08', 'PAR-09', 'PAR-10', 'PAR-11', 'PAR-12', 'PAR-13', 'PAR-14', 'PAR-15', 'PAR-16'))
    ),
  constraint movement_presentation_content_image_opacity_check
    check (image_opacity is null or image_opacity between 0 and 1),
  constraint movement_presentation_content_eyebrow_check
    check (eyebrow is null or char_length(eyebrow) between 1 and 60),
  constraint movement_presentation_content_title_check
    check (title is null or char_length(title) between 1 and 140),
  constraint movement_presentation_content_body_check
    check (body is null or char_length(body) between 1 and 360),
  constraint movement_presentation_content_alt_text_check
    check (alt_text is null or char_length(alt_text) between 24 and 240),
  constraint movement_presentation_content_media_alt_check
    check (
      (image_url is null and mobile_image_url is null)
      or (alt_text is not null and char_length(alt_text) between 24 and 240)
    ),
  constraint movement_presentation_content_revision_check
    check (revision >= 1),
  constraint movement_presentation_content_no_personal_placeholder_check
    check (
      coalesce(eyebrow, '') !~* '\{[[:space:]]*(nome|empresa|responsável)[[:space:]]*\}'
      and coalesce(title, '') !~* '\{[[:space:]]*(nome|empresa|responsável)[[:space:]]*\}'
      and coalesce(body, '') !~* '\{[[:space:]]*(nome|empresa|responsável)[[:space:]]*\}'
      and coalesce(alt_text, '') !~* '\{[[:space:]]*(nome|empresa|responsável)[[:space:]]*\}'
    )
);

create or replace function public.set_movement_presentation_content_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists movement_presentation_content_set_updated_at on public.movement_presentation_content;
create trigger movement_presentation_content_set_updated_at
before update on public.movement_presentation_content
for each row execute function public.set_movement_presentation_content_updated_at();

alter table public.movement_presentation_content enable row level security;
revoke all on public.movement_presentation_content from anon, authenticated;
grant select, insert, update, delete on public.movement_presentation_content to service_role;
revoke all on function public.set_movement_presentation_content_updated_at() from public, anon, authenticated;
grant execute on function public.set_movement_presentation_content_updated_at() to service_role;

notify pgrst, 'reload schema';
