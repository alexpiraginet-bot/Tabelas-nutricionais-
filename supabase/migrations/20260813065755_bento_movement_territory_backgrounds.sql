alter table public.movement_presentation_content
  add column if not exists background_color text;

alter table public.movement_presentation_content
  drop constraint if exists movement_presentation_content_scene_check;

alter table public.movement_presentation_content
  add constraint movement_presentation_content_scene_check
    check (
      (audience_type = 'influencer' and scene_id in (
        'INF-HERO', 'INF-01', 'INF-02', 'INF-03', 'INF-04', 'INF-05', 'INF-06', 'INF-07', 'INF-08', 'INF-09', 'INF-10', 'INF-11', 'INF-12', 'INF-13', 'INF-14',
        'INF-THEME-ARRIVAL', 'INF-THEME-MOVEMENT', 'INF-THEME-HOSPITALITY', 'INF-THEME-CARE', 'INF-THEME-CREATION'
      ))
      or (audience_type = 'partner' and scene_id in (
        'PAR-HERO', 'PAR-01', 'PAR-02', 'PAR-03', 'PAR-04', 'PAR-05', 'PAR-06', 'PAR-07', 'PAR-08', 'PAR-09', 'PAR-10', 'PAR-11', 'PAR-12', 'PAR-13', 'PAR-14', 'PAR-15', 'PAR-16',
        'PAR-THEME-ARRIVAL', 'PAR-THEME-MOVEMENT', 'PAR-THEME-HOSPITALITY', 'PAR-THEME-CARE', 'PAR-THEME-CREATION'
      ))
    );

alter table public.movement_presentation_content
  drop constraint if exists movement_presentation_content_background_color_check;

alter table public.movement_presentation_content
  add constraint movement_presentation_content_background_color_check
    check (background_color is null or background_color ~ '^#[0-9A-Fa-f]{6}$');

notify pgrst, 'reload schema';
