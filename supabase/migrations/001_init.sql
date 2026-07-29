-- CU Hunt schema (Supabase / Postgres)
-- Run in Supabase SQL editor, then seed.sql

create extension if not exists "pgcrypto";

create table if not exists game_settings (
  id int primary key default 1 check (id = 1),
  paused boolean not null default false,
  score_frozen boolean not null default false,
  capture_cutoff text not null default '18:25',
  item_cutoff text not null default '18:00',
  settle_time text not null default '18:45',
  hunt_date date not null default current_date,
  updated_at timestamptz not null default now()
);

create table if not exists big_teams (
  code text primary key,
  full_name text not null
);

create table if not exists small_teams (
  id text primary key,
  big_team text not null references big_teams(code),
  num int not null check (num between 1 and 6),
  item_1 int not null default 0,
  item_2 int not null default 0,
  item_3 int not null default 0,
  item_4 int not null default 0,
  item_5 int not null default 0,
  item_6 int not null default 0,
  task_ids int[] not null default '{}',
  late boolean not null default false,
  bonus_points int not null default 0,
  has_jam_ye boolean not null default false,
  unique (big_team, num)
);

create table if not exists territories (
  id int primary key,
  name text not null,
  lat double precision not null,
  lng double precision not null,
  image_url text,
  linkage text not null,
  curse text,
  task_name text not null,
  easy_rule text not null,
  hard_rule text not null,
  rain_venue text,
  owner_big_team text references big_teams(code),
  owner_small_team_id text references small_teams(id),
  difficulty text check (difficulty in ('easy', 'hard') or difficulty is null),
  captured_at timestamptz,
  cooldown_until timestamptz,
  closed boolean not null default false
);

create table if not exists captures (
  id uuid primary key default gen_random_uuid(),
  territory_id int not null references territories(id),
  small_team_id text not null references small_teams(id),
  big_team text not null,
  difficulty text not null,
  draw_result int,
  message text not null,
  created_at timestamptz not null default now()
);

create table if not exists item_events (
  id uuid primary key default gen_random_uuid(),
  actor_small_team_id text not null references small_teams(id),
  target_small_team_id text references small_teams(id),
  item_id int not null,
  delta int not null check (delta in (-1, 1)),
  bounced boolean not null default false,
  message text not null,
  created_at timestamptz not null default now()
);

create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  kind text not null default 'broadcast',
  created_at timestamptz not null default now()
);

create table if not exists hunt_events (
  id uuid primary key default gen_random_uuid(),
  time_label text not null,
  title text not null,
  body text not null,
  active boolean not null default false,
  started_at timestamptz
);

create table if not exists linkage_awards (
  id uuid primary key default gen_random_uuid(),
  big_team text not null references big_teams(code),
  linkage_id text not null,
  tier int not null check (tier in (1, 2)),
  points int not null,
  awarded_at timestamptz not null default now(),
  unique (big_team, linkage_id, tier)
);

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  role text not null,
  small_team_id text references small_teams(id),
  territory_id int references territories(id),
  display_name text not null,
  pin_hash text,
  created_at timestamptz not null default now()
);

-- Realtime
alter publication supabase_realtime add table territories;
alter publication supabase_realtime add table announcements;
alter publication supabase_realtime add table small_teams;
alter publication supabase_realtime add table captures;
alter publication supabase_realtime add table game_settings;
alter publication supabase_realtime add table hunt_events;

-- RPC: submit capture (server-side truth when using Supabase)
create or replace function submit_capture(
  p_territory_id int,
  p_small_team_id text,
  p_difficulty text,
  p_ignore_cooldown boolean default false
) returns jsonb
language plpgsql
as $$
declare
  v_team small_teams%rowtype;
  v_terr territories%rowtype;
  v_draw int;
  v_msg text;
  v_cooldown timestamptz;
  v_settings game_settings%rowtype;
begin
  select * into v_settings from game_settings where id = 1;
  if v_settings.paused then
    return jsonb_build_object('ok', false, 'error', '遊戲已暫停');
  end if;

  select * into v_team from small_teams where id = p_small_team_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', '找不到細組');
  end if;

  select * into v_terr from territories where id = p_territory_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', '找不到陣地');
  end if;

  if v_terr.closed then
    return jsonb_build_object('ok', false, 'error', '此陣地已關閉');
  end if;

  if v_terr.owner_big_team = v_team.big_team then
    return jsonb_build_object('ok', false, 'error', '不可攻佔自己大組的陣地');
  end if;

  if v_terr.cooldown_until is not null
     and v_terr.cooldown_until > now()
     and not p_ignore_cooldown
     and not v_team.has_jam_ye then
    return jsonb_build_object('ok', false, 'error', '冷卻中');
  end if;

  -- 60% miss draw
  if random() < 0.6 then
    v_draw := 0;
  else
    v_draw := floor(random() * 6 + 1)::int;
  end if;

  v_cooldown := now() + interval '15 minutes';

  update territories set
    owner_big_team = v_team.big_team,
    owner_small_team_id = v_team.id,
    difficulty = p_difficulty,
    captured_at = now(),
    cooldown_until = v_cooldown
  where id = p_territory_id;

  update small_teams set
    task_ids = case
      when p_territory_id = any(task_ids) then task_ids
      else array_append(task_ids, p_territory_id)
    end,
    has_jam_ye = case
      when v_terr.cooldown_until is not null and v_terr.cooldown_until > now() and has_jam_ye
        then false else has_jam_ye
    end,
    item_1 = item_1 + case when v_draw = 1 then 1 else 0 end,
    item_2 = item_2 + case when v_draw = 2 then 1 else 0 end,
    item_3 = item_3 + case when v_draw = 3 then 1 else 0 end,
    item_4 = item_4 + case when v_draw = 4 then 1 else 0 end,
    item_5 = item_5 + case when v_draw = 5 then 1 else 0 end,
    item_6 = item_6 + case when v_draw = 6 then 1 else 0 end
  where id = p_small_team_id;

  v_msg := format('%s 成功攻佔 %s', p_small_team_id, v_terr.name);

  insert into captures (territory_id, small_team_id, big_team, difficulty, draw_result, message)
  values (p_territory_id, p_small_team_id, v_team.big_team, p_difficulty, v_draw, v_msg);

  insert into announcements (title, body, kind)
  values ('陣地易主', v_msg, 'system');

  return jsonb_build_object('ok', true, 'draw', v_draw, 'message', v_msg);
end;
$$;
