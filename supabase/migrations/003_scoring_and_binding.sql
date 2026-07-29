-- CU Hunt: fix linkage hold clock, periodic award refresh, bind OEC/EC writes
-- Run after 002_rls_and_rpcs.sql

-- Hold clock = oldest capture among currently held linkage territories (matches app gameEngine)
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
    select array_agg(t.id), min(t.captured_at), count(*)::int
      into owned_ids, oldest, n
    from territories t
    where t.id = any (link.ids)
      and t.owner_big_team = p_team
      and t.captured_at is not null;

    if n is null or n = 0 or oldest is null then
      continue;
    end if;
    -- Continuous hold from the oldest currently held capture in the set
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

-- Periodic / on-demand check so 10-minute holds award without needing another capture
create or replace function refresh_linkage_awards()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  t text;
begin
  foreach t in array array['梟', '焽', '赬'] loop
    perform _award_linkages_for_team(t);
  end loop;
  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function refresh_linkage_awards() to anon, authenticated;

-- Drop old unbound signatures so clients cannot bypass binding
drop function if exists submit_capture(text, text, int, text, text, boolean);
drop function if exists obtain_item(text, text, text, int);
drop function if exists use_item(text, text, text, int, text);

-- Capture: OEC may only write to the territory they logged in with; admin unbound
create or replace function submit_capture(
  p_role text,
  p_pin text,
  p_territory_id int,
  p_small_team_id text,
  p_difficulty text,
  p_ignore_cooldown boolean default false,
  p_bound_territory_id int default null
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
  if p_role = 'oec' then
    if p_bound_territory_id is null then
      return jsonb_build_object('ok', false, 'error', '請重新登入（缺少負責陣地）');
    end if;
    if p_bound_territory_id <> p_territory_id then
      return jsonb_build_object('ok', false, 'error', '只能為登入時選擇的陣地登記攻佔');
    end if;
  end if;
  if p_difficulty not in ('easy', 'hard') then
    return jsonb_build_object('ok', false, 'error', '無效難度');
  end if;

  select * into v_settings from game_settings where id = 1;
  if v_settings.paused then
    return jsonb_build_object('ok', false, 'error', '遊戲已暫停');
  end if;

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

grant execute on function submit_capture(text,text,int,text,text,boolean,int) to anon, authenticated;

-- Obtain item: EC only for their logged-in 細組; admin unbound
create or replace function obtain_item(
  p_role text, p_pin text, p_small_team_id text, p_item_id int,
  p_bound_small_team_id text default null
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
  if p_role = 'ec' then
    if p_bound_small_team_id is null then
      return jsonb_build_object('ok', false, 'error', '請重新登入（缺少細組）');
    end if;
    if p_bound_small_team_id <> p_small_team_id then
      return jsonb_build_object('ok', false, 'error', '只能為登入時選擇的細組登錄錦囊');
    end if;
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

grant execute on function obtain_item(text,text,text,int,text) to anon, authenticated;

-- Use item: EC actor must be their logged-in 細組
create or replace function use_item(
  p_role text, p_pin text,
  p_actor_small_team_id text, p_item_id int, p_target_small_team_id text,
  p_bound_small_team_id text default null
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
  if p_role = 'ec' then
    if p_bound_small_team_id is null then
      return jsonb_build_object('ok', false, 'error', '請重新登入（缺少細組）');
    end if;
    if p_bound_small_team_id <> p_actor_small_team_id then
      return jsonb_build_object('ok', false, 'error', '只能用登入時選擇的細組發動錦囊');
    end if;
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

grant execute on function use_item(text,text,text,int,text,text) to anon, authenticated;
