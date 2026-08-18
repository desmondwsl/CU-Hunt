-- Fix reset_game for Supabase pg-safeupdate (UPDATE/DELETE must include a WHERE clause).

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
