-- CU Hunt: RLS + server-side PIN auth + write RPCs
-- Run after 001_init.sql + seed.sql

-- Role PINs (plaintext for camp simplicity; rotate before hunt day)
create table if not exists role_pins (
  role text primary key check (role in ('player', 'ec', 'oec', 'admin')),
  pin text not null
);

insert into role_pins (role, pin) values
  ('player', '1234'),
  ('ec', '2222'),
  ('oec', '3333'),
  ('admin', '9999')
on conflict (role) do nothing;

-- Helper: verify PIN
create or replace function verify_role_pin(p_role text, p_pin text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pin text;
begin
  select pin into v_pin from role_pins where role = p_role;
  if not found then return false; end if;
  return v_pin = p_pin;
end;
$$;

-- Login
create or replace function login_with_pin(
  p_role text,
  p_pin text,
  p_big_team text default null,
  p_small_num int default null,
  p_territory_id int default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_small_id text;
  v_name text;
begin
  if p_role not in ('player', 'ec', 'oec', 'admin') then
    return jsonb_build_object('ok', false, 'error', '無效身份');
  end if;
  if not verify_role_pin(p_role, p_pin) then
    return jsonb_build_object('ok', false, 'error', 'PIN 錯誤');
  end if;

  if p_role in ('player', 'ec') then
    if p_big_team is null or p_small_num is null then
      return jsonb_build_object('ok', false, 'error', '請選擇大組同細組');
    end if;
    if p_big_team not in ('梟', '焽', '赬') or p_small_num < 1 or p_small_num > 6 then
      return jsonb_build_object('ok', false, 'error', '無效細組');
    end if;
    v_small_id := p_big_team || p_small_num::text;
    return jsonb_build_object(
      'ok', true,
      'session', jsonb_build_object(
        'role', p_role,
        'bigTeam', p_big_team,
        'smallTeamNum', p_small_num,
        'smallTeamId', v_small_id,
        'displayName', case when p_role = 'ec' then 'EC ' || v_small_id else v_small_id end,
        'pin', p_pin
      )
    );
  end if;

  if p_role = 'oec' then
    if p_territory_id is null then
      return jsonb_build_object('ok', false, 'error', '請選擇負責陣地');
    end if;
    select name into v_name from territories where id = p_territory_id;
    if not found then
      return jsonb_build_object('ok', false, 'error', '找不到陣地');
    end if;
    return jsonb_build_object(
      'ok', true,
      'session', jsonb_build_object(
        'role', 'oec',
        'territoryId', p_territory_id,
        'displayName', format('OEC · %s %s', p_territory_id, v_name),
        'pin', p_pin
      )
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'session', jsonb_build_object(
      'role', 'admin',
      'displayName', 'OC Admin',
      'pin', p_pin
    )
  );
end;
$$;

create or replace function _award_linkages_for_team(p_team text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  link record;
  owned_ids int[];
  oldest timestamptz;
  n int;
  has_t1 boolean;
  has_t2 boolean;
begin
  for link in
    select * from (values
      ('新書院深度遊', array[2,12,20,24,21], 4, 3000, 5000),
      ('我要上堂', array[9,4,6,1,19], 4, 3000, 5000),
      ('放鬆時間', array[14,3,10,15], 3, 2000, 3000),
      ('人文精神', array[5,8,7,17,25], 4, 4000, 5000),
      ('你有你嘅健康，我有我嘅健康，我哋一齊活在香港', array[13,11,16,18], 3, 3000, 4000),
      ('羅桂祥是個好地方', array[22,23], 0, 0, 8000)
    ) as x(id, ids, t2_count, t2_bonus, t1_bonus)
  loop
    select array_agg(t.id), max(t.captured_at), count(*)::int
      into owned_ids, oldest, n
    from territories t
    where t.id = any (link.ids)
      and t.owner_big_team = p_team
      and t.captured_at is not null;

    if n is null or n = 0 or oldest is null then
      continue;
    end if;
    -- Hold clock starts when the set last became complete (newest capture among held)
    if now() - oldest < interval '10 minutes' then
      continue;
    end if;

    select exists(
      select 1 from linkage_awards
      where big_team = p_team and linkage_id = link.id and tier = 1
    ) into has_t1;
    select exists(
      select 1 from linkage_awards
      where big_team = p_team and linkage_id = link.id and tier = 2
    ) into has_t2;

    if n >= cardinality(link.ids) and not has_t1 then
      insert into linkage_awards (big_team, linkage_id, tier, points)
      values (p_team, link.id, 1, link.t1_bonus)
      on conflict do nothing;
      insert into announcements (title, body, kind)
      values ('連結達成：' || link.id, p_team || ' 達成一級連結 +' || link.t1_bonus, 'system');
    elsif link.t2_count > 0 and n >= link.t2_count and n < cardinality(link.ids) and not has_t2 and not has_t1 then
      insert into linkage_awards (big_team, linkage_id, tier, points)
      values (p_team, link.id, 2, link.t2_bonus)
      on conflict do nothing;
      insert into announcements (title, body, kind)
      values ('連結達成：' || link.id, p_team || ' 達成二級連結 +' || link.t2_bonus, 'system');
    end if;
  end loop;
end;
$$;

-- Replace submit_capture with PIN-gated version
create or replace function submit_capture(
  p_role text,
  p_pin text,
  p_territory_id int,
  p_small_team_id text,
  p_difficulty text,
  p_ignore_cooldown boolean default false
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team small_teams%rowtype;
  v_terr territories%rowtype;
  v_draw int;
  v_msg text;
  v_cooldown timestamptz;
  v_settings game_settings%rowtype;
  v_draw_label text;
begin
  if p_role not in ('oec', 'admin') then
    return jsonb_build_object('ok', false, 'error', '無權限登記攻佔');
  end if;
  if not verify_role_pin(p_role, p_pin) then
    return jsonb_build_object('ok', false, 'error', 'PIN 錯誤');
  end if;
  if p_difficulty not in ('easy', 'hard') then
    return jsonb_build_object('ok', false, 'error', '無效難度');
  end if;

  select * into v_settings from game_settings where id = 1;
  if v_settings.paused then
    return jsonb_build_object('ok', false, 'error', '遊戲已暫停');
  end if;

  -- Capture cutoff HH:mm on hunt_date
  if (v_settings.hunt_date + v_settings.capture_cutoff::time) <= now() and not p_ignore_cooldown then
    return jsonb_build_object('ok', false, 'error', '已過攻佔截止時間（' || v_settings.capture_cutoff || '）');
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

  if random() < 0.6 then v_draw := 0; else v_draw := floor(random() * 6 + 1)::int; end if;
  v_cooldown := now() + interval '15 minutes';

  update territories set
    owner_big_team = v_team.big_team,
    owner_small_team_id = v_team.id,
    difficulty = p_difficulty,
    captured_at = now(),
    cooldown_until = v_cooldown
  where id = p_territory_id;

  update small_teams set
    task_ids = case when p_territory_id = any(task_ids) then task_ids else array_append(task_ids, p_territory_id) end,
    has_jam_ye = case
      when v_terr.cooldown_until is not null and v_terr.cooldown_until > now() and has_jam_ye then false
      else has_jam_ye end,
    item_1 = item_1 + case when v_draw = 1 then 1 else 0 end,
    item_2 = item_2 + case when v_draw = 2 then 1 else 0 end,
    item_3 = item_3 + case when v_draw = 3 then 1 else 0 end,
    item_4 = item_4 + case when v_draw = 4 then 1 else 0 end,
    item_5 = item_5 + case when v_draw = 5 then 1 else 0 end,
    item_6 = item_6 + case when v_draw = 6 then 1 else 0 end
  where id = p_small_team_id;

  v_draw_label := case when v_draw = 0 then '抽唔到' else '錦囊 #' || v_draw end;
  v_msg := format('%s 成功攻佔 %s（%s），冷卻至 %s。錦囊：%s',
    p_small_team_id, v_terr.name,
    case when p_difficulty = 'easy' then '簡單' else '困難' end,
    to_char(v_cooldown, 'HH24:MI:SS'),
    v_draw_label);

  insert into captures (territory_id, small_team_id, big_team, difficulty, draw_result, message)
  values (p_territory_id, p_small_team_id, v_team.big_team, p_difficulty, v_draw, v_msg);
  insert into announcements (title, body, kind) values ('陣地易主', v_msg, 'system');

  perform _award_linkages_for_team(v_team.big_team);

  return jsonb_build_object('ok', true, 'draw', v_draw, 'message', v_msg);
end;
$$;

-- Obtain item (EC / admin)
create or replace function obtain_item(
  p_role text, p_pin text, p_small_team_id text, p_item_id int
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_msg text;
begin
  if p_role not in ('ec', 'admin') then
    return jsonb_build_object('ok', false, 'error', '無權限');
  end if;
  if not verify_role_pin(p_role, p_pin) then
    return jsonb_build_object('ok', false, 'error', 'PIN 錯誤');
  end if;
  if p_item_id < 1 or p_item_id > 6 then
    return jsonb_build_object('ok', false, 'error', '無效錦囊');
  end if;
  if not exists(select 1 from small_teams where id = p_small_team_id) then
    return jsonb_build_object('ok', false, 'error', '找不到細組');
  end if;

  execute format('update small_teams set item_%s = item_%s + 1 where id = $1', p_item_id, p_item_id)
    using p_small_team_id;

  v_msg := p_small_team_id || ' 獲得錦囊 #' || p_item_id;
  insert into item_events (actor_small_team_id, item_id, delta, message)
  values (p_small_team_id, p_item_id, 1, v_msg);

  return jsonb_build_object('ok', true, 'message', v_msg);
end;
$$;

-- Use item
create or replace function use_item(
  p_role text, p_pin text,
  p_actor_small_team_id text, p_item_id int, p_target_small_team_id text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_settings game_settings%rowtype;
  v_actor small_teams%rowtype;
  v_target small_teams%rowtype;
  v_count int;
  v_bounced boolean := false;
  v_msg text;
begin
  if p_role not in ('ec', 'admin') then
    return jsonb_build_object('ok', false, 'error', '無權限');
  end if;
  if not verify_role_pin(p_role, p_pin) then
    return jsonb_build_object('ok', false, 'error', 'PIN 錯誤');
  end if;
  if p_item_id = 6 then
    return jsonb_build_object('ok', false, 'error', '閘住反彈只能被動觸發');
  end if;
  if p_item_id < 1 or p_item_id > 5 then
    return jsonb_build_object('ok', false, 'error', '無效錦囊');
  end if;

  select * into v_settings from game_settings where id = 1;
  if (v_settings.hunt_date + v_settings.item_cutoff::time) <= now() then
    return jsonb_build_object('ok', false, 'error', '已過錦囊使用截止（' || v_settings.item_cutoff || '）');
  end if;

  select * into v_actor from small_teams where id = p_actor_small_team_id for update;
  select * into v_target from small_teams where id = p_target_small_team_id for update;
  if not found or v_actor.id is null then
    return jsonb_build_object('ok', false, 'error', '找不到細組');
  end if;
  if v_actor.big_team = v_target.big_team then
    return jsonb_build_object('ok', false, 'error', '不可對同大組使用');
  end if;

  execute format('select item_%s from small_teams where id = $1', p_item_id)
    into v_count using p_actor_small_team_id;
  if v_count is null or v_count <= 0 then
    return jsonb_build_object('ok', false, 'error', '沒有此錦囊');
  end if;

  execute format('update small_teams set item_%s = item_%s - 1 where id = $1', p_item_id, p_item_id)
    using p_actor_small_team_id;

  if v_target.item_6 > 0 then
    v_bounced := true;
    update small_teams set item_6 = item_6 - 1 where id = p_target_small_team_id;
    v_msg := p_target_small_team_id || ' 用閘住反彈，將錦囊 #' || p_item_id || ' 反彈返 ' || p_actor_small_team_id;
  else
    v_msg := p_actor_small_team_id || ' 對 ' || p_target_small_team_id || ' 使用了錦囊 #' || p_item_id;
  end if;

  insert into item_events (actor_small_team_id, target_small_team_id, item_id, delta, bounced, message)
  values (p_actor_small_team_id, p_target_small_team_id, p_item_id, -1, v_bounced, v_msg);
  insert into announcements (title, body, kind)
  values (case when v_bounced then '錦囊反彈！' else '錦囊發動' end, v_msg, 'system');

  return jsonb_build_object('ok', true, 'bounced', v_bounced, 'message', v_msg);
end;
$$;

-- Broadcast
create or replace function post_broadcast(
  p_role text, p_pin text, p_title text, p_body text, p_kind text default 'broadcast'
) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if p_role <> 'admin' or not verify_role_pin(p_role, p_pin) then
    return jsonb_build_object('ok', false, 'error', '無權限');
  end if;
  insert into announcements (title, body, kind) values (p_title, p_body, coalesce(p_kind, 'broadcast'));
  return jsonb_build_object('ok', true);
end;
$$;

-- Settings
create or replace function update_game_settings(
  p_role text, p_pin text, p_patch jsonb
) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if p_role <> 'admin' or not verify_role_pin(p_role, p_pin) then
    return jsonb_build_object('ok', false, 'error', '無權限');
  end if;
  update game_settings set
    paused = coalesce((p_patch->>'paused')::boolean, paused),
    score_frozen = coalesce((p_patch->>'score_frozen')::boolean, score_frozen),
    capture_cutoff = coalesce(p_patch->>'capture_cutoff', capture_cutoff),
    item_cutoff = coalesce(p_patch->>'item_cutoff', item_cutoff),
    settle_time = coalesce(p_patch->>'settle_time', settle_time),
    hunt_date = coalesce((p_patch->>'hunt_date')::date, hunt_date),
    updated_at = now()
  where id = 1;
  return jsonb_build_object('ok', true);
end;
$$;

-- Override territory
create or replace function override_territory(
  p_role text, p_pin text, p_territory_id int, p_patch jsonb
) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if p_role <> 'admin' or not verify_role_pin(p_role, p_pin) then
    return jsonb_build_object('ok', false, 'error', '無權限');
  end if;
  update territories set
    owner_big_team = case when p_patch ? 'owner_big_team' then nullif(p_patch->>'owner_big_team','') else owner_big_team end,
    owner_small_team_id = case when p_patch ? 'owner_small_team_id' then nullif(p_patch->>'owner_small_team_id','') else owner_small_team_id end,
    difficulty = case when p_patch ? 'difficulty' then nullif(p_patch->>'difficulty','') else difficulty end,
    captured_at = case when p_patch ? 'captured_at' then nullif(p_patch->>'captured_at','')::timestamptz else captured_at end,
    cooldown_until = case when p_patch ? 'cooldown_until' then nullif(p_patch->>'cooldown_until','')::timestamptz else cooldown_until end,
    closed = coalesce((p_patch->>'closed')::boolean, closed)
  where id = p_territory_id;
  return jsonb_build_object('ok', true);
end;
$$;

-- Team flags / bonus / relics
create or replace function set_team_flags(
  p_role text, p_pin text, p_small_team_id text, p_patch jsonb
) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if p_role <> 'admin' or not verify_role_pin(p_role, p_pin) then
    return jsonb_build_object('ok', false, 'error', '無權限');
  end if;
  update small_teams set
    late = coalesce((p_patch->>'late')::boolean, late),
    bonus_points = coalesce((p_patch->>'bonus_points')::int, bonus_points),
    has_jam_ye = coalesce((p_patch->>'has_jam_ye')::boolean, has_jam_ye)
  where id = p_small_team_id;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function add_team_bonus(
  p_role text, p_pin text, p_small_team_id text, p_delta int, p_reason text
) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if p_role <> 'admin' or not verify_role_pin(p_role, p_pin) then
    return jsonb_build_object('ok', false, 'error', '無權限');
  end if;
  update small_teams set bonus_points = bonus_points + p_delta where id = p_small_team_id;
  insert into announcements (title, body, kind)
  values ('分數調整', p_small_team_id || ' ' || case when p_delta >= 0 then '+' else '' end || p_delta || '（' || p_reason || '）', 'system');
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function grant_relic(
  p_role text, p_pin text, p_small_team_id text, p_relic text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare i int; v_id int;
begin
  if p_role <> 'admin' or not verify_role_pin(p_role, p_pin) then
    return jsonb_build_object('ok', false, 'error', '無權限');
  end if;
  if p_relic = 'Jam野' then
    update small_teams set has_jam_ye = true where id = p_small_team_id;
  elsif p_relic = 'Engine大粒嘢' then
    for i in 1..4 loop
      v_id := floor(random() * 6 + 1)::int;
      execute format('update small_teams set item_%s = item_%s + 1 where id = $1', v_id, v_id)
        using p_small_team_id;
    end loop;
  else
    return jsonb_build_object('ok', false, 'error', '未知聖物');
  end if;
  insert into announcements (title, body, kind)
  values ('聖物：' || p_relic, p_small_team_id || ' 獲得聖物「' || p_relic || '」！', 'event');
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function toggle_hunt_event(
  p_role text, p_pin text, p_event_id uuid, p_active boolean
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_ev hunt_events%rowtype;
begin
  if p_role <> 'admin' or not verify_role_pin(p_role, p_pin) then
    return jsonb_build_object('ok', false, 'error', '無權限');
  end if;
  update hunt_events set
    active = p_active,
    started_at = case when p_active then now() else started_at end
  where id = p_event_id
  returning * into v_ev;
  if p_active then
    insert into announcements (title, body, kind)
    values ('突發事件：' || v_ev.title, v_ev.body, 'event');
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function add_custom_event(
  p_role text, p_pin text, p_time_label text, p_title text, p_body text
) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if p_role <> 'admin' or not verify_role_pin(p_role, p_pin) then
    return jsonb_build_object('ok', false, 'error', '無權限');
  end if;
  insert into hunt_events (time_label, title, body) values (p_time_label, p_title, p_body);
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function reset_game(
  p_role text, p_pin text
) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if p_role <> 'admin' or not verify_role_pin(p_role, p_pin) then
    return jsonb_build_object('ok', false, 'error', '無權限');
  end if;
  update territories set
    owner_big_team = null, owner_small_team_id = null, difficulty = null,
    captured_at = null, cooldown_until = null, closed = false;
  update small_teams set
    item_1=0,item_2=0,item_3=0,item_4=0,item_5=0,item_6=0,
    task_ids='{}', late=false, bonus_points=0, has_jam_ye=false;
  delete from captures;
  delete from item_events;
  delete from linkage_awards;
  delete from announcements;
  update hunt_events set active = false, started_at = null;
  update game_settings set paused = false, score_frozen = false, updated_at = now() where id = 1;
  insert into announcements (title, body, kind)
  values ('遊戲已重置', 'OC 已重置全部遊戲資料。', 'system');
  return jsonb_build_object('ok', true);
end;
$$;

-- RLS: public read, no direct writes (writes only via SECURITY DEFINER RPCs)
alter table game_settings enable row level security;
alter table big_teams enable row level security;
alter table small_teams enable row level security;
alter table territories enable row level security;
alter table captures enable row level security;
alter table item_events enable row level security;
alter table announcements enable row level security;
alter table hunt_events enable row level security;
alter table linkage_awards enable row level security;
alter table profiles enable row level security;
alter table role_pins enable row level security;

drop policy if exists read_game_settings on game_settings;
drop policy if exists read_big_teams on big_teams;
drop policy if exists read_small_teams on small_teams;
drop policy if exists read_territories on territories;
drop policy if exists read_captures on captures;
drop policy if exists read_item_events on item_events;
drop policy if exists read_announcements on announcements;
drop policy if exists read_hunt_events on hunt_events;
drop policy if exists read_linkage_awards on linkage_awards;

create policy read_game_settings on game_settings for select using (true);
create policy read_big_teams on big_teams for select using (true);
create policy read_small_teams on small_teams for select using (true);
create policy read_territories on territories for select using (true);
create policy read_captures on captures for select using (true);
create policy read_item_events on item_events for select using (true);
create policy read_announcements on announcements for select using (true);
create policy read_hunt_events on hunt_events for select using (true);
create policy read_linkage_awards on linkage_awards for select using (true);
-- role_pins: no public select (only via verify inside SECURITY DEFINER)

grant usage on schema public to anon, authenticated;
grant select on game_settings, big_teams, small_teams, territories, captures, item_events, announcements, hunt_events, linkage_awards to anon, authenticated;
grant execute on function login_with_pin(text,text,text,int,int) to anon, authenticated;
grant execute on function submit_capture(text,text,int,text,text,boolean) to anon, authenticated;
grant execute on function obtain_item(text,text,text,int) to anon, authenticated;
grant execute on function use_item(text,text,text,int,text) to anon, authenticated;
grant execute on function post_broadcast(text,text,text,text,text) to anon, authenticated;
grant execute on function update_game_settings(text,text,jsonb) to anon, authenticated;
grant execute on function override_territory(text,text,int,jsonb) to anon, authenticated;
grant execute on function set_team_flags(text,text,text,jsonb) to anon, authenticated;
grant execute on function add_team_bonus(text,text,text,int,text) to anon, authenticated;
grant execute on function grant_relic(text,text,text,text) to anon, authenticated;
grant execute on function toggle_hunt_event(text,text,uuid,boolean) to anon, authenticated;
grant execute on function add_custom_event(text,text,text,text,text) to anon, authenticated;
grant execute on function reset_game(text,text) to anon, authenticated;

-- Realtime (ignore errors if already added)
do $$ begin
  alter publication supabase_realtime add table territories;
exception when duplicate_object then null; when others then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table announcements;
exception when duplicate_object then null; when others then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table small_teams;
exception when duplicate_object then null; when others then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table captures;
exception when duplicate_object then null; when others then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table game_settings;
exception when duplicate_object then null; when others then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table hunt_events;
exception when duplicate_object then null; when others then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table item_events;
exception when duplicate_object then null; when others then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table linkage_awards;
exception when duplicate_object then null; when others then null;
end $$;
