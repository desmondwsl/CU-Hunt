-- 大組顏色 + 突發事件地點；原有時間／名稱／顏色保持不變，只加可改欄位。

alter table big_teams
  add column if not exists color text not null default '#9AA3AF';

update big_teams set color = '#1E3A5F' where code = '梟';
update big_teams set color = '#B42318' where code = '焽';
update big_teams set color = '#0F6B4C' where code = '赬';

alter table hunt_events
  add column if not exists place text not null default '';

update hunt_events set place = '中大範圍（djj 周圍行）'
  where title = '尋找 djj' and place = '';
update hunt_events set place = '百萬大道'
  where title = '百萬大道' and place = '';
update hunt_events set place = '煲底'
  where title = '煲底' and place = '';

create or replace function update_big_team_color(
  p_role text, p_pin text, p_code text, p_color text
) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if p_role <> 'admin' or not verify_role_pin(p_role, p_pin) then
    return jsonb_build_object('ok', false, 'error', '無權限');
  end if;
  if p_color !~ '^#[0-9A-Fa-f]{6}$' then
    return jsonb_build_object('ok', false, 'error', '顏色請用 #RRGGBB');
  end if;
  update big_teams set color = p_color where code = p_code;
  if not found then
    return jsonb_build_object('ok', false, 'error', '找不到大組');
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function update_hunt_event(
  p_role text,
  p_pin text,
  p_event_id uuid,
  p_time_label text,
  p_title text,
  p_body text,
  p_place text
) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if p_role <> 'admin' or not verify_role_pin(p_role, p_pin) then
    return jsonb_build_object('ok', false, 'error', '無權限');
  end if;
  update hunt_events set
    time_label = coalesce(nullif(trim(p_time_label), ''), time_label),
    title = coalesce(nullif(trim(p_title), ''), title),
    body = coalesce(p_body, body),
    place = coalesce(p_place, place)
  where id = p_event_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', '找不到事件');
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

drop function if exists add_custom_event(text, text, text, text, text);

create function add_custom_event(
  p_role text,
  p_pin text,
  p_time_label text,
  p_title text,
  p_body text,
  p_place text default ''
) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if p_role <> 'admin' or not verify_role_pin(p_role, p_pin) then
    return jsonb_build_object('ok', false, 'error', '無權限');
  end if;
  insert into hunt_events (time_label, title, body, place)
  values (p_time_label, p_title, p_body, coalesce(p_place, ''));
  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function update_big_team_color(text, text, text, text) to anon, authenticated;
grant execute on function update_hunt_event(text, text, uuid, text, text, text, text) to anon, authenticated;
grant execute on function add_custom_event(text, text, text, text, text, text) to anon, authenticated;

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
    values (
      '突發事件：' || v_ev.title,
      case
        when coalesce(v_ev.place, '') <> '' then '地點：' || v_ev.place || E'\n' || v_ev.body
        else v_ev.body
      end,
      'event'
    );
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

do $$ begin
  alter publication supabase_realtime add table big_teams;
exception when duplicate_object then null; when others then null;
end $$;
