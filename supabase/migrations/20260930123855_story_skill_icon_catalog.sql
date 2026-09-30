-- Curated, reusable Crystal Quest skill icons and their class assignments.
-- The catalog stores safe built-in glyph keys or an image asset path; colors are
-- design tokens so the same icon can be re-themed without shipping new UI code.
create table if not exists public.story_skill_icons (
  code text primary key check (code ~ '^[a-z0-9_]+$'),
  label text not null,
  icon_key text not null check (icon_key in ('shield', 'hourglass', 'combo', 'arrow')),
  asset_path text,
  gem_color text not null default '#e4e1ff' check (gem_color ~ '^#[0-9A-Fa-f]{6}$'),
  glow_color text not null default '#c9c4ff' check (glow_color ~ '^#[0-9A-Fa-f]{6}$'),
  icon_color text not null default '#5751D8' check (icon_color ~ '^#[0-9A-Fa-f]{6}$'),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint story_skill_icons_asset_path_check check (
    asset_path is null or (position('..' in asset_path) = 0 and asset_path ~ '^assets/[A-Za-z0-9_./-]+\.(png|webp|svg)$')
  )
);

create table if not exists public.story_skill_definitions (
  class_code text primary key check (class_code in ('warrior', 'mage', 'pugilist', 'ranger')),
  skill_code text not null unique check (skill_code ~ '^[a-z0-9_]+$'),
  skill_name text not null,
  description text not null default '',
  icon_code text not null references public.story_skill_icons(code) on update cascade on delete restrict,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.story_skill_icons enable row level security;
alter table public.story_skill_definitions enable row level security;

create policy "active story skill icons are readable"
  on public.story_skill_icons for select to anon, authenticated
  using (active);
create policy "active story skill definitions are readable"
  on public.story_skill_definitions for select to anon, authenticated
  using (active);

grant select on public.story_skill_icons, public.story_skill_definitions to anon, authenticated;
grant all on public.story_skill_icons, public.story_skill_definitions to service_role;

insert into public.story_skill_icons (code, label, icon_key, gem_color, glow_color, icon_color)
values
  ('guardian_crystal', '수호 결정', 'shield', '#e4e1ff', '#c9c4ff', '#5751D8'),
  ('time_crystal', '시간 결정', 'hourglass', '#d9f8f2', '#a5e5dc', '#2d958b'),
  ('combo_crystal', '콤보 결정', 'combo', '#e4e1ff', '#c9c4ff', '#5751D8'),
  ('fortune_crystal', '행운 결정', 'arrow', '#d9f8f2', '#a5e5dc', '#2d958b')
on conflict (code) do update set
  label = excluded.label,
  icon_key = excluded.icon_key,
  gem_color = excluded.gem_color,
  glow_color = excluded.glow_color,
  icon_color = excluded.icon_color,
  updated_at = now();

insert into public.story_skill_definitions (class_code, skill_code, skill_name, description, icon_code)
values
  ('warrior', 'guardian_time', '수호의 시간', '위기의 순간에 문제 제한시간을 1초 늘려요.', 'guardian_crystal'),
  ('mage', 'time_stop', '타임 스톱', '집중력이 빛나면 문제 시간을 잠시 멈춰요.', 'time_crystal'),
  ('pugilist', 'rush_combo', '러시 콤보', '3연속 정답마다 보너스 크리스털을 받아요.', 'combo_crystal'),
  ('ranger', 'lucky_arrow', '행운의 화살', '보물상자에서 최소 20 크리스털을 찾아요.', 'fortune_crystal')
on conflict (class_code) do update set
  skill_code = excluded.skill_code,
  skill_name = excluded.skill_name,
  description = excluded.description,
  icon_code = excluded.icon_code,
  active = true,
  updated_at = now();
