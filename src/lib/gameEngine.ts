import { BigTeamCode, TeamColors } from '@/constants/Colors';
import { HUNTBOOK, LATE_PENALTY_RATE, MIN_TASKS, MISSING_TASK_PENALTY_RATE } from '@/constants/huntbook';
import { ITEMS, ItemId, MISS_DRAW_RATE } from '@/constants/items';
import {
  BIG_TEAMS,
  COOLDOWN_MINUTES,
  CURSES,
  LINKAGE_HOLD_MINUTES,
  LINKAGES,
  POINTS_PER_MIN,
  TERRITORIES,
} from '@/constants/territories';
import type {
  Announcement,
  BigTeamInfo,
  CaptureEvent,
  CurseActive,
  Difficulty,
  GameSettings,
  GameState,
  ItemEvent,
  SmallTeamState,
  TerritoryState,
} from './types';

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export function createInitialState(): GameState {
  const smallTeams: SmallTeamState[] = [];
  for (const bt of BIG_TEAMS) {
    for (let n = 1; n <= 6; n++) {
      smallTeams.push({
        id: `${bt.code}${n}`,
        bigTeam: bt.code,
        num: n,
        items: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
        taskIds: [],
        late: false,
        territoryMinutesEasy: 0,
        territoryMinutesHard: 0,
        bonusPoints: 0,
        hasJamYe: false,
        freeItemDraws: 0,
      });
    }
  }

  const territories: TerritoryState[] = TERRITORIES.map((t) => ({
    ...t,
    ownerBigTeam: null,
    ownerSmallTeamId: null,
    difficulty: null,
    capturedAt: null,
    cooldownUntil: null,
    closed: false,
  }));

  const bigTeams: BigTeamInfo[] = BIG_TEAMS.map((bt) => ({
    code: bt.code,
    fullName: bt.fullName,
    color: TeamColors[bt.code],
  }));

  const settings: GameSettings = {
    paused: false,
    scoreFrozen: false,
    captureCutoff: '18:25',
    itemCutoff: '18:00',
    settleTime: '18:45',
    huntDate: todayISO(),
    contacts: HUNTBOOK.contacts,
  };

  return {
    settings,
    bigTeams,
    territories,
    smallTeams,
    captures: [],
    itemEvents: [],
    announcements: [
      {
        id: uid(),
        title: '歡迎黎到 CU Hunt',
        body: '請細閱 HuntBook，注意安全。世界廣播會出現喺呢度。',
        at: new Date().toISOString(),
        kind: 'system',
      },
    ],
    events: HUNTBOOK.events.map((e) => ({
      id: uid(),
      timeLabel: e.time,
      title: e.title,
      body: e.body,
      place: e.place,
      active: false,
    })),
    linkageAwards: [],
    activeCurses: [],
    updatedAt: new Date().toISOString(),
  };
}

function parseHHMM(hhmm: string, date: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(`${date}T00:00:00`);
  d.setHours(h, m, 0, 0);
  return d;
}

export function isPastCutoff(settings: GameSettings, cutoffKey: 'captureCutoff' | 'itemCutoff' | 'settleTime', now = new Date()) {
  return now >= parseHHMM(settings[cutoffKey], settings.huntDate);
}

export function minutesHeld(capturedAt: string | null, until: Date, frozenAt?: Date | null): number {
  if (!capturedAt) return 0;
  const start = new Date(capturedAt).getTime();
  const end = (frozenAt ?? until).getTime();
  if (end <= start) return 0;
  return Math.floor((end - start) / 60000);
}

export function computeScores(state: GameState, now = new Date()) {
  const settleAt = parseHHMM(state.settings.settleTime, state.settings.huntDate);
  // Freeze clock: past settle → settle time; otherwise live "now"
  // (scoreFrozen still uses now unless a frozen-at timestamp exists — banking preserves past holds)
  const freezeAt = now >= settleAt ? settleAt : now;

  type Acc = {
    easyMin: number;
    hardMin: number;
    held: number;
  };
  const bySmall: Record<string, Acc> = {};
  const byBig: Record<
    BigTeamCode,
    Acc & { linkage: number; curse: number; event: number }
  > = {
    梟: { easyMin: 0, hardMin: 0, held: 0, linkage: 0, curse: 0, event: 0 },
    焽: { easyMin: 0, hardMin: 0, held: 0, linkage: 0, curse: 0, event: 0 },
    赬: { easyMin: 0, hardMin: 0, held: 0, linkage: 0, curse: 0, event: 0 },
  };

  // Banked minutes from past holds (survive territory handoffs)
  for (const st of state.smallTeams) {
    const acc = (bySmall[st.id] ??= { easyMin: 0, hardMin: 0, held: 0 });
    acc.easyMin += st.territoryMinutesEasy;
    acc.hardMin += st.territoryMinutesHard;
    byBig[st.bigTeam].easyMin += st.territoryMinutesEasy;
    byBig[st.bigTeam].hardMin += st.territoryMinutesHard;
    byBig[st.bigTeam].event += st.bonusPoints;
  }

  // Live minutes from territories currently held
  for (const t of state.territories) {
    if (!t.ownerBigTeam || !t.ownerSmallTeamId || !t.difficulty || !t.capturedAt) continue;
    const mins = minutesHeld(t.capturedAt, freezeAt);
    const acc = (bySmall[t.ownerSmallTeamId] ??= { easyMin: 0, hardMin: 0, held: 0 });
    if (t.difficulty === 'easy') acc.easyMin += mins;
    else acc.hardMin += mins;
    acc.held += 1;
    byBig[t.ownerBigTeam].held += 1;
    if (t.difficulty === 'easy') byBig[t.ownerBigTeam].easyMin += mins;
    else byBig[t.ownerBigTeam].hardMin += mins;
  }

  for (const a of state.linkageAwards) {
    byBig[a.bigTeam].linkage += a.points;
  }
  for (const c of state.activeCurses) {
    byBig[c.bigTeam].curse += c.points;
  }

  const smallScores = state.smallTeams.map((st) => {
    const live = bySmall[st.id] ?? { easyMin: 0, hardMin: 0, held: 0 };
    let raw =
      live.easyMin * POINTS_PER_MIN.easy +
      live.hardMin * POINTS_PER_MIN.hard +
      st.bonusPoints;
    const missing = Math.max(0, MIN_TASKS - st.taskIds.length);
    if (missing > 0) raw = Math.floor(raw * (1 - missing * MISSING_TASK_PENALTY_RATE));
    if (st.late) raw = Math.floor(raw * (1 - LATE_PENALTY_RATE));
    return {
      ...st,
      easyMin: live.easyMin,
      hardMin: live.hardMin,
      held: live.held,
      score: raw,
    };
  });

  const bigScores = BIG_TEAMS.map((bt) => {
    const b = byBig[bt.code];
    const territoryPoints =
      b.easyMin * POINTS_PER_MIN.easy + b.hardMin * POINTS_PER_MIN.hard;
    const smallSum = smallScores
      .filter((s) => s.bigTeam === bt.code)
      .reduce((sum, s) => sum + s.score, 0);
    const total = smallSum + b.linkage + b.curse;
    return {
      code: bt.code,
      fullName: bt.fullName,
      territoryPoints,
      linkageBonus: b.linkage,
      cursePenalty: b.curse,
      eventPoints: b.event,
      total,
      heldCount: b.held,
    };
  }).sort((a, b) => b.total - a.total);

  return { smallScores, bigScores, freezeAt };
}

/** Credit previous holder for minutes held before a handoff / clear. */
export function bankHeldMinutes(
  smallTeams: SmallTeamState[],
  terr: Pick<TerritoryState, 'ownerSmallTeamId' | 'difficulty' | 'capturedAt'>,
  until: Date,
): SmallTeamState[] {
  if (!terr.ownerSmallTeamId || !terr.difficulty || !terr.capturedAt) return smallTeams;
  const mins = minutesHeld(terr.capturedAt, until);
  if (mins <= 0) return smallTeams;
  return smallTeams.map((st) => {
    if (st.id !== terr.ownerSmallTeamId) return st;
    if (terr.difficulty === 'easy') {
      return { ...st, territoryMinutesEasy: st.territoryMinutesEasy + mins };
    }
    return { ...st, territoryMinutesHard: st.territoryMinutesHard + mins };
  });
}

function drawItem(): ItemId | 0 {
  if (Math.random() < MISS_DRAW_RATE) return 0;
  return (Math.floor(Math.random() * 6) + 1) as ItemId;
}

/** Active curse penalties from current ownership (shared by local + remote hydrate). */
export function computeActiveCurses(
  territories: TerritoryState[],
  now = new Date(),
): CurseActive[] {
  const active: CurseActive[] = [];
  for (const bt of BIG_TEAMS) {
    for (const curse of Object.values(CURSES)) {
      const held = curse.territoryIds
        .map((id) => territories.find((t) => t.id === id))
        .filter((t): t is TerritoryState => Boolean(t?.ownerBigTeam === bt.code && t.capturedAt));
      if (held.length < curse.territoryIds.length) continue;
      const oldest = Math.min(...held.map((t) => new Date(t.capturedAt!).getTime()));
      if ((now.getTime() - oldest) / 60000 < LINKAGE_HOLD_MINUTES) continue;
      active.push({
        bigTeam: bt.code,
        curseId: curse.id,
        points: curse.penalty,
        since: new Date(oldest).toISOString(),
      });
    }
  }
  return active;
}

function checkLinkagesAndCurses(state: GameState, now: Date): GameState {
  const next = {
    ...state,
    linkageAwards: [...state.linkageAwards],
    activeCurses: computeActiveCurses(state.territories, now),
  };

  for (const bt of BIG_TEAMS) {
    for (const link of Object.values(LINKAGES)) {
      const owned = link.territoryIds.filter((id) => {
        const t = state.territories.find((x) => x.id === id);
        return t?.ownerBigTeam === bt.code && t.capturedAt;
      });
      if (owned.length === 0) continue;

      // Continuous hold: oldest capture among currently held set must be >= hold minutes ago
      const heldTerritories = owned
        .map((id) => state.territories.find((x) => x.id === id)!)
        .filter(Boolean);
      const oldest = Math.min(...heldTerritories.map((t) => new Date(t.capturedAt!).getTime()));
      const holdMins = (now.getTime() - oldest) / 60000;
      if (holdMins < LINKAGE_HOLD_MINUTES) continue;

      const hasTier1 = next.linkageAwards.some(
        (a) => a.bigTeam === bt.code && a.linkageId === link.id && a.tier === 1,
      );
      const hasTier2 = next.linkageAwards.some(
        (a) => a.bigTeam === bt.code && a.linkageId === link.id && a.tier === 2,
      );

      if (owned.length >= link.territoryIds.length && !hasTier1) {
        next.linkageAwards.push({
          bigTeam: bt.code,
          linkageId: link.id,
          tier: 1,
          points: link.tier1Bonus,
          awardedAt: now.toISOString(),
        });
        next.announcements = [
          {
            id: uid(),
            title: `連結達成：${link.id}`,
            body: `${bt.fullName} 達成一級連結 +${link.tier1Bonus}`,
            at: now.toISOString(),
            kind: 'system',
          },
          ...next.announcements,
        ];
      } else if (
        link.tier2Count > 0 &&
        owned.length >= link.tier2Count &&
        owned.length < link.territoryIds.length &&
        !hasTier2 &&
        !hasTier1
      ) {
        next.linkageAwards.push({
          bigTeam: bt.code,
          linkageId: link.id,
          tier: 2,
          points: link.tier2Bonus,
          awardedAt: now.toISOString(),
        });
        next.announcements = [
          {
            id: uid(),
            title: `連結達成：${link.id}`,
            body: `${bt.fullName} 達成二級連結 +${link.tier2Bonus}`,
            at: now.toISOString(),
            kind: 'system',
          },
          ...next.announcements,
        ];
      }
    }
  }

  return next;
}

export type CaptureResult =
  | { ok: true; state: GameState; capture: CaptureEvent; draw: ItemId | 0 }
  | { ok: false; error: string };

export function submitCapture(
  state: GameState,
  params: {
    territoryId: number;
    smallTeamId: string;
    difficulty: Difficulty;
    ignoreCooldown?: boolean;
  },
): CaptureResult {
  const now = new Date();
  if (state.settings.paused) return { ok: false, error: '遊戲已暫停' };
  if (isPastCutoff(state.settings, 'captureCutoff', now) && !params.ignoreCooldown) {
    return { ok: false, error: `已過攻佔截止時間（${state.settings.captureCutoff}）` };
  }

  const team = state.smallTeams.find((t) => t.id === params.smallTeamId);
  if (!team) return { ok: false, error: '找不到細組' };

  const terr = state.territories.find((t) => t.id === params.territoryId);
  if (!terr) return { ok: false, error: '找不到陣地' };
  if (terr.closed) return { ok: false, error: '此陣地已關閉' };
  if (terr.ownerBigTeam === team.bigTeam) {
    return { ok: false, error: '不可攻佔自己大組的陣地' };
  }
  if (
    terr.cooldownUntil &&
    new Date(terr.cooldownUntil) > now &&
    !params.ignoreCooldown &&
    !team.hasJamYe
  ) {
    return { ok: false, error: `冷卻中直至 ${new Date(terr.cooldownUntil).toLocaleTimeString()}` };
  }

  const usingJam = !!(
    terr.cooldownUntil &&
    new Date(terr.cooldownUntil) > now &&
    team.hasJamYe
  );

  const cooldownUntil = new Date(now.getTime() + COOLDOWN_MINUTES * 60000).toISOString();
  const draw = drawItem();

  // Bank previous holder's minutes so their score survives the handoff
  let smallTeams = bankHeldMinutes(state.smallTeams, terr, now);

  const territories = state.territories.map((t) =>
    t.id === terr.id
      ? {
          ...t,
          ownerBigTeam: team.bigTeam,
          ownerSmallTeamId: team.id,
          difficulty: params.difficulty,
          capturedAt: now.toISOString(),
          cooldownUntil,
        }
      : t,
  );

  smallTeams = smallTeams.map((st) => {
    if (st.id !== team.id) return st;
    const next = { ...st, taskIds: st.taskIds.includes(terr.id) ? st.taskIds : [...st.taskIds, terr.id] };
    if (usingJam) next.hasJamYe = false;
    if (draw !== 0) {
      next.items = { ...next.items, [draw]: next.items[draw] + 1 };
    }
    return next;
  });

  const drawLabel = draw === 0 ? '抽唔到' : ITEMS[draw].name;
  const capture: CaptureEvent = {
    id: uid(),
    territoryId: terr.id,
    territoryName: terr.name,
    bigTeam: team.bigTeam,
    smallTeamId: team.id,
    difficulty: params.difficulty,
    at: now.toISOString(),
    message: `${team.id} 成功攻佔 ${terr.name}（${params.difficulty === 'easy' ? '簡單' : '困難'}），冷卻至 ${new Date(cooldownUntil).toLocaleTimeString()}。錦囊：${drawLabel}`,
    drawResult: draw,
  };

  let next: GameState = {
    ...state,
    territories,
    smallTeams,
    captures: [capture, ...state.captures],
    announcements: [
      {
        id: uid(),
        title: '陣地易主',
        body: capture.message,
        at: now.toISOString(),
        kind: 'system',
      },
      ...state.announcements,
    ],
    updatedAt: now.toISOString(),
  };

  next = checkLinkagesAndCurses(next, now);
  return { ok: true, state: next, capture, draw };
}

export function obtainItem(
  state: GameState,
  smallTeamId: string,
  itemId: ItemId,
): { ok: true; state: GameState } | { ok: false; error: string } {
  const team = state.smallTeams.find((t) => t.id === smallTeamId);
  if (!team) return { ok: false, error: '找不到細組' };
  const now = new Date().toISOString();
  const smallTeams = state.smallTeams.map((st) =>
    st.id === smallTeamId
      ? { ...st, items: { ...st.items, [itemId]: st.items[itemId] + 1 } }
      : st,
  );
  const ev: ItemEvent = {
    id: uid(),
    actorSmallTeamId: smallTeamId,
    delta: 1,
    itemId,
    at: now,
    message: `${smallTeamId} 獲得錦囊「${ITEMS[itemId].name}」`,
  };
  return {
    ok: true,
    state: {
      ...state,
      smallTeams,
      itemEvents: [ev, ...state.itemEvents],
      updatedAt: now,
    },
  };
}

export function useItem(
  state: GameState,
  params: { actorSmallTeamId: string; itemId: ItemId; targetSmallTeamId: string },
): { ok: true; state: GameState; bounced: boolean } | { ok: false; error: string } {
  const nowDate = new Date();
  if (isPastCutoff(state.settings, 'itemCutoff', nowDate)) {
    return { ok: false, error: `已過錦囊使用截止（${state.settings.itemCutoff}）` };
  }
  const actor = state.smallTeams.find((t) => t.id === params.actorSmallTeamId);
  const target = state.smallTeams.find((t) => t.id === params.targetSmallTeamId);
  if (!actor || !target) return { ok: false, error: '找不到細組' };
  if (actor.items[params.itemId] <= 0) return { ok: false, error: '沒有此錦囊' };
  if (params.itemId === 6) return { ok: false, error: '閘住反彈只能被動觸發' };
  if (actor.bigTeam === target.bigTeam) return { ok: false, error: '不可對同大組使用' };

  let bounced = false;
  let smallTeams = state.smallTeams.map((st) => {
    if (st.id === actor.id) {
      return { ...st, items: { ...st.items, [params.itemId]: st.items[params.itemId] - 1 } };
    }
    return st;
  });

  const targetNow = smallTeams.find((t) => t.id === target.id)!;
  if (targetNow.items[6] > 0) {
    bounced = true;
    smallTeams = smallTeams.map((st) => {
      if (st.id === target.id) {
        return { ...st, items: { ...st.items, 6: st.items[6] - 1 } };
      }
      return st;
    });
  }

  const now = nowDate.toISOString();
  const ev: ItemEvent = {
    id: uid(),
    actorSmallTeamId: actor.id,
    delta: -1,
    itemId: params.itemId,
    targetSmallTeamId: target.id,
    at: now,
    bounced,
    message: bounced
      ? `${target.id} 用閘住反彈，將「${ITEMS[params.itemId].name}」反彈返 ${actor.id}`
      : `${actor.id} 對 ${target.id} 使用了「${ITEMS[params.itemId].name}」`,
  };

  const announcement: Announcement = {
    id: uid(),
    title: bounced ? '錦囊反彈！' : '錦囊發動',
    body: ev.message,
    at: now,
    kind: 'system',
  };

  return {
    ok: true,
    bounced,
    state: {
      ...state,
      smallTeams,
      itemEvents: [ev, ...state.itemEvents],
      announcements: [announcement, ...state.announcements],
      updatedAt: now,
    },
  };
}

export function postAnnouncement(
  state: GameState,
  title: string,
  body: string,
  kind: Announcement['kind'] = 'broadcast',
): GameState {
  const now = new Date().toISOString();
  return {
    ...state,
    announcements: [{ id: uid(), title, body, at: now, kind }, ...state.announcements],
    updatedAt: now,
  };
}

export function grantRelic(
  state: GameState,
  smallTeamId: string,
  relic: 'Engine大粒嘢' | 'Jam野',
): { ok: true; state: GameState } | { ok: false; error: string } {
  const team = state.smallTeams.find((t) => t.id === smallTeamId);
  if (!team) return { ok: false, error: '找不到細組' };
  const now = new Date().toISOString();
  const smallTeams = state.smallTeams.map((st) => {
    if (st.id !== smallTeamId) return st;
    if (relic === 'Jam野') return { ...st, hasJamYe: true };
    // Engine大粒嘢: 4 free random items
    const items = { ...st.items };
    for (let i = 0; i < 4; i++) {
      const id = (Math.floor(Math.random() * 6) + 1) as ItemId;
      items[id] += 1;
    }
    return { ...st, items, freeItemDraws: st.freeItemDraws + 4 };
  });
  return {
    ok: true,
    state: postAnnouncement(
      { ...state, smallTeams, updatedAt: now },
      `聖物：${relic}`,
      `${smallTeamId} 獲得聖物「${relic}」！`,
      'event',
    ),
  };
}

export function adjustBonus(
  state: GameState,
  smallTeamId: string,
  delta: number,
  reason: string,
): GameState {
  const smallTeams = state.smallTeams.map((st) =>
    st.id === smallTeamId ? { ...st, bonusPoints: st.bonusPoints + delta } : st,
  );
  return postAnnouncement(
    { ...state, smallTeams, updatedAt: new Date().toISOString() },
    '分數調整',
    `${smallTeamId} ${delta >= 0 ? '+' : ''}${delta}（${reason}）`,
    'system',
  );
}
