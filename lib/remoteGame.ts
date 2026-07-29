import { HUNTBOOK } from '@/constants/huntbook';
import { BIG_TEAMS, TERRITORIES } from '@/constants/territories';
import type { BigTeamCode } from '@/constants/Colors';
import type { ItemId } from '@/constants/items';
import type {
  Announcement,
  CaptureEvent,
  Difficulty,
  GameEvent,
  GameSettings,
  GameState,
  ItemEvent,
  LinkageAward,
  Session,
  SmallTeamState,
  TerritoryState,
} from './types';
import { isSupabaseConfigured, supabase } from './supabase';
import { computeActiveCurses } from './gameEngine';

function requireClient() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase 未設定');
  }
  return supabase;
}

function mapTerritory(row: Record<string, unknown>): TerritoryState {
  const seed = TERRITORIES.find((t) => t.id === Number(row.id));
  return {
    id: Number(row.id),
    name: String(row.name ?? seed?.name ?? ''),
    lat: Number(row.lat ?? seed?.lat ?? 0),
    lng: Number(row.lng ?? seed?.lng ?? 0),
    imageUrl: String(row.image_url ?? seed?.imageUrl ?? ''),
    linkage: (row.linkage as TerritoryState['linkage']) ?? seed!.linkage,
    curse: (row.curse as TerritoryState['curse']) ?? seed?.curse,
    taskName: String(row.task_name ?? seed?.taskName ?? ''),
    easyRule: String(row.easy_rule ?? seed?.easyRule ?? ''),
    hardRule: String(row.hard_rule ?? seed?.hardRule ?? ''),
    rainVenue: String(row.rain_venue ?? seed?.rainVenue ?? ''),
    ownerBigTeam: (row.owner_big_team as BigTeamCode | null) ?? null,
    ownerSmallTeamId: (row.owner_small_team_id as string | null) ?? null,
    difficulty: (row.difficulty as Difficulty | null) ?? null,
    capturedAt: row.captured_at ? String(row.captured_at) : null,
    cooldownUntil: row.cooldown_until ? String(row.cooldown_until) : null,
    closed: Boolean(row.closed),
  };
}

function mapSmallTeam(row: Record<string, unknown>): SmallTeamState {
  return {
    id: String(row.id),
    bigTeam: row.big_team as BigTeamCode,
    num: Number(row.num),
    items: {
      1: Number(row.item_1 ?? 0),
      2: Number(row.item_2 ?? 0),
      3: Number(row.item_3 ?? 0),
      4: Number(row.item_4 ?? 0),
      5: Number(row.item_5 ?? 0),
      6: Number(row.item_6 ?? 0),
    },
    taskIds: Array.isArray(row.task_ids) ? (row.task_ids as number[]) : [],
    late: Boolean(row.late),
    territoryMinutesEasy: Number(row.territory_minutes_easy ?? 0),
    territoryMinutesHard: Number(row.territory_minutes_hard ?? 0),
    bonusPoints: Number(row.bonus_points ?? 0),
    hasJamYe: Boolean(row.has_jam_ye),
    freeItemDraws: 0,
  };
}

export async function fetchRemoteGameState(): Promise<GameState> {
  const client = requireClient();
  const [
    settingsRes,
    terrRes,
    teamsRes,
    capturesRes,
    itemsRes,
    annRes,
    eventsRes,
    linkRes,
  ] = await Promise.all([
    client.from('game_settings').select('*').eq('id', 1).maybeSingle(),
    client.from('territories').select('*').order('id'),
    client.from('small_teams').select('*').order('id'),
    client.from('captures').select('*').order('created_at', { ascending: false }).limit(100),
    client.from('item_events').select('*').order('created_at', { ascending: false }).limit(100),
    client.from('announcements').select('*').order('created_at', { ascending: false }).limit(100),
    client.from('hunt_events').select('*').order('time_label'),
    client.from('linkage_awards').select('*'),
  ]);

  const err =
    settingsRes.error ||
    terrRes.error ||
    teamsRes.error ||
    capturesRes.error ||
    itemsRes.error ||
    annRes.error ||
    eventsRes.error ||
    linkRes.error;
  if (err) throw new Error(err.message);

  const s = settingsRes.data ?? {};
  const settings: GameSettings = {
    paused: Boolean(s.paused),
    scoreFrozen: Boolean(s.score_frozen),
    captureCutoff: String(s.capture_cutoff ?? '18:25'),
    itemCutoff: String(s.item_cutoff ?? '18:00'),
    settleTime: String(s.settle_time ?? '18:45'),
    huntDate: String(s.hunt_date ?? new Date().toISOString().slice(0, 10)),
    contacts: HUNTBOOK.contacts,
  };

  const territories = (terrRes.data ?? []).map((r) => mapTerritory(r as Record<string, unknown>));
  // Fill any missing seed territories if seed incomplete
  for (const seed of TERRITORIES) {
    if (!territories.find((t) => t.id === seed.id)) {
      territories.push({
        ...seed,
        ownerBigTeam: null,
        ownerSmallTeamId: null,
        difficulty: null,
        capturedAt: null,
        cooldownUntil: null,
        closed: false,
      });
    }
  }
  territories.sort((a, b) => a.id - b.id);

  let smallTeams = (teamsRes.data ?? []).map((r) => mapSmallTeam(r as Record<string, unknown>));
  if (smallTeams.length === 0) {
    smallTeams = BIG_TEAMS.flatMap((bt) =>
      [1, 2, 3, 4, 5, 6].map((n) => ({
        id: `${bt.code}${n}`,
        bigTeam: bt.code,
        num: n,
        items: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 } as Record<ItemId, number>,
        taskIds: [],
        late: false,
        territoryMinutesEasy: 0,
        territoryMinutesHard: 0,
        bonusPoints: 0,
        hasJamYe: false,
        freeItemDraws: 0,
      })),
    );
  }

  const captures: CaptureEvent[] = (capturesRes.data ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    const terr = territories.find((t) => t.id === Number(row.territory_id));
    return {
      id: String(row.id),
      territoryId: Number(row.territory_id),
      territoryName: terr?.name ?? String(row.territory_id),
      bigTeam: row.big_team as BigTeamCode,
      smallTeamId: String(row.small_team_id),
      difficulty: row.difficulty as Difficulty,
      at: String(row.created_at),
      message: String(row.message),
      drawResult: (row.draw_result as ItemId | 0 | undefined) ?? undefined,
    };
  });

  const itemEvents: ItemEvent[] = (itemsRes.data ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    return {
      id: String(row.id),
      actorSmallTeamId: String(row.actor_small_team_id),
      delta: Number(row.delta) as 1 | -1,
      itemId: Number(row.item_id) as ItemId,
      targetSmallTeamId: row.target_small_team_id ? String(row.target_small_team_id) : undefined,
      at: String(row.created_at),
      message: String(row.message),
      bounced: Boolean(row.bounced),
    };
  });

  const announcements: Announcement[] = (annRes.data ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    return {
      id: String(row.id),
      title: String(row.title),
      body: String(row.body),
      at: String(row.created_at),
      kind: (row.kind as Announcement['kind']) ?? 'system',
    };
  });

  const events: GameEvent[] = (eventsRes.data ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    return {
      id: String(row.id),
      timeLabel: String(row.time_label),
      title: String(row.title),
      body: String(row.body),
      active: Boolean(row.active),
      startedAt: row.started_at ? String(row.started_at) : undefined,
    };
  });

  const linkageAwards: LinkageAward[] = (linkRes.data ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    return {
      bigTeam: row.big_team as BigTeamCode,
      linkageId: row.linkage_id as LinkageAward['linkageId'],
      tier: Number(row.tier) as 1 | 2,
      points: Number(row.points),
      awardedAt: String(row.awarded_at),
    };
  });

  return {
    settings,
    territories,
    smallTeams,
    captures,
    itemEvents,
    announcements,
    events,
    linkageAwards,
    activeCurses: computeActiveCurses(territories),
    updatedAt: new Date().toISOString(),
  };
}

export function subscribeRemoteGame(onChange: () => void): () => void {
  if (!isSupabaseConfigured || !supabase) return () => {};
  const client = supabase;
  const channel = client
    .channel('cuhunt-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'territories' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'small_teams' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'captures' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'item_events' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'game_settings' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'hunt_events' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'linkage_awards' }, onChange)
    .subscribe();
  return () => {
    void client.removeChannel(channel);
  };
}

type Creds = { role: Session['role']; pin: string };

function credsOrThrow(session: Session | null): Creds {
  if (!session?.pin) throw new Error('請重新登入（需要 PIN）');
  return { role: session.role, pin: session.pin };
}

export async function remoteLogin(params: {
  role: Session['role'];
  pin: string;
  bigTeam?: BigTeamCode;
  smallTeamNum?: number;
  territoryId?: number;
}): Promise<{ ok: true; session: Session } | { ok: false; error: string }> {
  const client = requireClient();
  const { data, error } = await client.rpc('login_with_pin', {
    p_role: params.role,
    p_pin: params.pin,
    p_big_team: params.bigTeam ?? null,
    p_small_num: params.smallTeamNum ?? null,
    p_territory_id: params.territoryId ?? null,
  });
  if (error) return { ok: false, error: error.message };
  const result = data as { ok: boolean; error?: string; session?: Session };
  if (!result?.ok || !result.session) return { ok: false, error: result?.error ?? '登入失敗' };
  return { ok: true, session: { ...result.session, pin: params.pin } };
}

export async function remoteCapture(
  session: Session | null,
  params: {
    territoryId: number;
    smallTeamId: string;
    difficulty: Difficulty;
    ignoreCooldown?: boolean;
  },
) {
  const client = requireClient();
  const { role, pin } = credsOrThrow(session);
  const { data, error } = await client.rpc('submit_capture', {
    p_role: role,
    p_pin: pin,
    p_territory_id: params.territoryId,
    p_small_team_id: params.smallTeamId,
    p_difficulty: params.difficulty,
    p_ignore_cooldown: params.ignoreCooldown ?? false,
    p_bound_territory_id: session?.role === 'oec' ? (session.territoryId ?? null) : null,
  });
  if (error) return { ok: false as const, error: error.message };
  const result = data as { ok: boolean; error?: string; draw?: number; message?: string };
  if (!result.ok) return { ok: false as const, error: result.error ?? '攻佔失敗' };
  return {
    ok: true as const,
    draw: (result.draw ?? 0) as ItemId | 0,
    message: result.message ?? '',
  };
}

export async function remoteObtain(session: Session | null, smallTeamId: string, itemId: ItemId) {
  const client = requireClient();
  const { role, pin } = credsOrThrow(session);
  const { data, error } = await client.rpc('obtain_item', {
    p_role: role,
    p_pin: pin,
    p_small_team_id: smallTeamId,
    p_item_id: itemId,
    p_bound_small_team_id: session?.role === 'ec' ? (session.smallTeamId ?? null) : null,
  });
  if (error) return { ok: false as const, error: error.message };
  const result = data as { ok: boolean; error?: string; message?: string };
  if (!result.ok) return { ok: false as const, error: result.error ?? '失敗' };
  return { ok: true as const, message: result.message ?? '' };
}

export async function remoteUseItem(
  session: Session | null,
  actorSmallTeamId: string,
  itemId: ItemId,
  targetSmallTeamId: string,
) {
  const client = requireClient();
  const { role, pin } = credsOrThrow(session);
  const { data, error } = await client.rpc('use_item', {
    p_role: role,
    p_pin: pin,
    p_actor_small_team_id: actorSmallTeamId,
    p_item_id: itemId,
    p_target_small_team_id: targetSmallTeamId,
    p_bound_small_team_id: session?.role === 'ec' ? (session.smallTeamId ?? null) : null,
  });
  if (error) return { ok: false as const, error: error.message };
  const result = data as { ok: boolean; error?: string; bounced?: boolean; message?: string };
  if (!result.ok) return { ok: false as const, error: result.error ?? '失敗' };
  return {
    ok: true as const,
    bounced: Boolean(result.bounced),
    message: result.message ?? '',
  };
}

export async function remoteBroadcast(session: Session | null, title: string, body: string) {
  const client = requireClient();
  const { role, pin } = credsOrThrow(session);
  const { data, error } = await client.rpc('post_broadcast', {
    p_role: role,
    p_pin: pin,
    p_title: title,
    p_body: body,
    p_kind: 'broadcast',
  });
  if (error) return { ok: false as const, error: error.message };
  const result = data as { ok: boolean; error?: string };
  if (!result.ok) return { ok: false as const, error: result.error ?? '失敗' };
  return { ok: true as const };
}

export async function remoteUpdateSettings(
  session: Session | null,
  patch: Partial<{
    paused: boolean;
    scoreFrozen: boolean;
    captureCutoff: string;
    itemCutoff: string;
    settleTime: string;
    huntDate: string;
  }>,
) {
  const client = requireClient();
  const { role, pin } = credsOrThrow(session);
  const { data, error } = await client.rpc('update_game_settings', {
    p_role: role,
    p_pin: pin,
    p_patch: {
      paused: patch.paused,
      score_frozen: patch.scoreFrozen,
      capture_cutoff: patch.captureCutoff,
      item_cutoff: patch.itemCutoff,
      settle_time: patch.settleTime,
      hunt_date: patch.huntDate,
    },
  });
  if (error) return { ok: false as const, error: error.message };
  const result = data as { ok: boolean; error?: string };
  if (!result.ok) return { ok: false as const, error: result.error ?? '失敗' };
  return { ok: true as const };
}

export async function remoteOverrideTerritory(
  session: Session | null,
  territoryId: number,
  patch: Record<string, unknown>,
) {
  const client = requireClient();
  const { role, pin } = credsOrThrow(session);
  const { data, error } = await client.rpc('override_territory', {
    p_role: role,
    p_pin: pin,
    p_territory_id: territoryId,
    p_patch: patch,
  });
  if (error) return { ok: false as const, error: error.message };
  const result = data as { ok: boolean; error?: string };
  if (!result.ok) return { ok: false as const, error: result.error ?? '失敗' };
  return { ok: true as const };
}

export async function remoteSetTeamFlags(
  session: Session | null,
  smallTeamId: string,
  patch: Record<string, unknown>,
) {
  const client = requireClient();
  const { role, pin } = credsOrThrow(session);
  const { data, error } = await client.rpc('set_team_flags', {
    p_role: role,
    p_pin: pin,
    p_small_team_id: smallTeamId,
    p_patch: patch,
  });
  if (error) return { ok: false as const, error: error.message };
  const result = data as { ok: boolean; error?: string };
  if (!result.ok) return { ok: false as const, error: result.error ?? '失敗' };
  return { ok: true as const };
}

export async function remoteAddBonus(
  session: Session | null,
  smallTeamId: string,
  delta: number,
  reason: string,
) {
  const client = requireClient();
  const { role, pin } = credsOrThrow(session);
  const { data, error } = await client.rpc('add_team_bonus', {
    p_role: role,
    p_pin: pin,
    p_small_team_id: smallTeamId,
    p_delta: delta,
    p_reason: reason,
  });
  if (error) return { ok: false as const, error: error.message };
  const result = data as { ok: boolean; error?: string };
  if (!result.ok) return { ok: false as const, error: result.error ?? '失敗' };
  return { ok: true as const };
}

export async function remoteGrantRelic(
  session: Session | null,
  smallTeamId: string,
  relic: 'Engine大粒嘢' | 'Jam野',
) {
  const client = requireClient();
  const { role, pin } = credsOrThrow(session);
  const { data, error } = await client.rpc('grant_relic', {
    p_role: role,
    p_pin: pin,
    p_small_team_id: smallTeamId,
    p_relic: relic,
  });
  if (error) return { ok: false as const, error: error.message };
  const result = data as { ok: boolean; error?: string };
  if (!result.ok) return { ok: false as const, error: result.error ?? '失敗' };
  return { ok: true as const };
}

export async function remoteToggleEvent(session: Session | null, eventId: string, active: boolean) {
  const client = requireClient();
  const { role, pin } = credsOrThrow(session);
  const { data, error } = await client.rpc('toggle_hunt_event', {
    p_role: role,
    p_pin: pin,
    p_event_id: eventId,
    p_active: active,
  });
  if (error) return { ok: false as const, error: error.message };
  const result = data as { ok: boolean; error?: string };
  if (!result.ok) return { ok: false as const, error: result.error ?? '失敗' };
  return { ok: true as const };
}

export async function remoteAddCustomEvent(
  session: Session | null,
  timeLabel: string,
  title: string,
  body: string,
) {
  const client = requireClient();
  const { role, pin } = credsOrThrow(session);
  const { data, error } = await client.rpc('add_custom_event', {
    p_role: role,
    p_pin: pin,
    p_time_label: timeLabel,
    p_title: title,
    p_body: body,
  });
  if (error) return { ok: false as const, error: error.message };
  const result = data as { ok: boolean; error?: string };
  if (!result.ok) return { ok: false as const, error: result.error ?? '失敗' };
  return { ok: true as const };
}

export async function remoteResetGame(session: Session | null) {
  const client = requireClient();
  const { role, pin } = credsOrThrow(session);
  const { data, error } = await client.rpc('reset_game', { p_role: role, p_pin: pin });
  if (error) return { ok: false as const, error: error.message };
  const result = data as { ok: boolean; error?: string };
  if (!result.ok) return { ok: false as const, error: result.error ?? '失敗' };
  return { ok: true as const };
}

/** Idempotent linkage award pass (10-minute holds without needing another capture). */
export async function remoteRefreshLinkageAwards() {
  const client = requireClient();
  const { error } = await client.rpc('refresh_linkage_awards');
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}
