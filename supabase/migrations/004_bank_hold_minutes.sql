-- CU Hunt: bank territory hold minutes so scores survive handoffs
-- Run after 003_scoring_and_binding.sql

alter table small_teams
  add column if not exists territory_minutes_easy int not null default 0,
  add column if not exists territory_minutes_hard int not null default 0;

create or replace function _bank_territory_hold(p_terr territories)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mins int;
begin
  if p_terr.owner_small_team_id is null
     or p_terr.captured_at is null
     or p_terr.difficulty is null then
    return;
  end if;
  v_mins := greatest(0, floor(extract(epoch from (now() - p_terr.captured_at)) / 60)::int);
  if v_mins <= 0 then
    return;
  end if;
  if p_terr.difficulty = 'easy' then
    update small_teams
      set territory_minutes_easy = territory_minutes_easy + v_mins
    where id = p_terr.owner_small_team_id;
  else
    update small_teams
      set territory_minutes_hard = territory_minutes_hard + v_mins
    where id = p_terr.owner_small_team_id;
  end if;
end;
$$;

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

  -- Keep previous holder's earned minutes before ownership changes
  perform _bank_territory_hold(v_terr);

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

create or replace function override_territory(
  p_role text, p_pin text, p_territory_id int, p_patch jsonb
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_terr territories%rowtype;
  v_changing boolean;
begin
  if p_role <> 'admin' or not verify_role_pin(p_role, p_pin) then
    return jsonb_build_object('ok', false, 'error', '無權限');
  end if;

  select * into v_terr from territories where id = p_territory_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', '找不到陣地');
  end if;

  v_changing :=
    (p_patch ? 'owner_big_team')
    or (p_patch ? 'owner_small_team_id')
    or (p_patch ? 'difficulty')
    or (p_patch ? 'captured_at');

  if v_changing then
    perform _bank_territory_hold(v_terr);
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
    captured_at = null, cooldown_until = null, closed = false
  where true;
  update small_teams set
    item_1=0,item_2=0,item_3=0,item_4=0,item_5=0,item_6=0,
    task_ids='{}', late=false, bonus_points=0, has_jam_ye=false,
    territory_minutes_easy=0, territory_minutes_hard=0
  where true;
  delete from captures where true;
  delete from item_events where true;
  delete from linkage_awards where true;
  delete from announcements where true;
  update hunt_events set active = false, started_at = null where true;
  update game_settings set paused = false, score_frozen = false, updated_at = now() where id = 1;
  insert into announcements (title, body, kind)
  values ('遊戲已重置', 'OC 已重置全部遊戲資料。', 'system');
  return jsonb_build_object('ok', true);
end;
$$;
