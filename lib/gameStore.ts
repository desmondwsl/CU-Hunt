import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BigTeamCode } from '@/constants/Colors';
import type { ItemId } from '@/constants/items';
import { DEFAULT_PINS, TERRITORIES } from '@/constants/territories';
import {
  adjustBonus,
  computeScores,
  createInitialState,
  grantRelic,
  obtainItem,
  postAnnouncement,
  submitCapture,
  useItem,
} from './gameEngine';
import {
  fetchRemoteGameState,
  remoteAddBonus,
  remoteAddCustomEvent,
  remoteBroadcast,
  remoteCapture,
  remoteGrantRelic,
  remoteLogin,
  remoteObtain,
  remoteOverrideTerritory,
  remoteRefreshLinkageAwards,
  remoteResetGame,
  remoteSetTeamFlags,
  remoteToggleEvent,
  remoteUpdateSettings,
  remoteUseItem,
  subscribeRemoteGame,
} from './remoteGame';
import { isSupabaseConfigured } from './supabase';
import type { Difficulty, GameState, Session } from './types';

const STATE_KEY = 'cuhunt.gamestate.v1';

type Listener = () => void;

class GameStore {
  private state: GameState = createInitialState();
  private listeners = new Set<Listener>();
  private ready = false;
  private session: Session | null = null;
  private unsubRemote: (() => void) | null = null;
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
  private awardsTimer: ReturnType<typeof setInterval> | null = null;
  private hydrateError: string | null = null;
  private remoteReady = false;

  get usingRemote() {
    return isSupabaseConfigured;
  }

  getHydrateError() {
    return this.hydrateError;
  }

  isRemoteReady() {
    return !this.usingRemote || this.remoteReady;
  }

  setSession(session: Session | null) {
    this.session = session;
  }

  /** OEC/EC writes must match login binding (local + remote). */
  private assertBinding(params: {
    territoryId?: number;
    smallTeamId?: string;
    actorSmallTeamId?: string;
  }): string | null {
    const s = this.session;
    if (!s) return '請先登入';
    if (s.role === 'oec') {
      if (params.territoryId != null && s.territoryId !== params.territoryId) {
        return '只能為登入時選擇的陣地登記攻佔';
      }
    }
    if (s.role === 'ec') {
      const team = params.smallTeamId ?? params.actorSmallTeamId;
      if (team != null && s.smallTeamId !== team) {
        return '只能為登入時選擇的細組操作錦囊';
      }
    }
    return null;
  }

  async init() {
    if (this.ready) return;
    if (this.usingRemote) {
      await this.hydrateRemote(true);
      this.unsubRemote = subscribeRemoteGame(() => this.scheduleRemoteRefresh());
      this.awardsTimer = setInterval(() => {
        void this.refreshAwards();
      }, 60_000);
    } else {
      try {
        const raw = await AsyncStorage.getItem(STATE_KEY);
        if (raw) this.state = JSON.parse(raw) as GameState;
      } catch {
        this.state = createInitialState();
      }
    }
    this.ready = true;
    this.emit();
  }

  private async hydrateRemote(isInit: boolean) {
    try {
      this.state = await fetchRemoteGameState();
      this.hydrateError = null;
      this.remoteReady = true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : '無法連接 Supabase';
      this.hydrateError = msg;
      console.warn('Supabase hydrate failed', e);
      if (isInit && !this.remoteReady) {
        // Keep empty seed but flag error so UI does not pretend live state is OK
        this.state = createInitialState();
      }
    }
  }

  private scheduleRemoteRefresh() {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    this.refreshTimer = setTimeout(() => {
      void this.refreshFromRemote();
    }, 250);
  }

  async refreshFromRemote() {
    if (!this.usingRemote) return;
    await this.hydrateRemote(false);
    this.emit();
  }

  async refreshAwards() {
    if (!this.usingRemote || !this.remoteReady) return;
    try {
      await remoteRefreshLinkageAwards();
      await this.refreshFromRemote();
    } catch (e) {
      console.warn('Linkage award refresh failed', e);
    }
  }

  getState() {
    return this.state;
  }

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    this.listeners.forEach((fn) => fn());
  }

  private async persistLocal(next: GameState) {
    this.state = next;
    this.emit();
    await AsyncStorage.setItem(STATE_KEY, JSON.stringify(next));
  }

  async reset() {
    if (this.usingRemote) {
      const r = await remoteResetGame(this.session);
      if (!r.ok) throw new Error(r.error);
      await this.refreshFromRemote();
      return;
    }
    await this.persistLocal(createInitialState());
  }

  async capture(params: {
    territoryId: number;
    smallTeamId: string;
    difficulty: Difficulty;
    ignoreCooldown?: boolean;
  }) {
    const bound = this.assertBinding({ territoryId: params.territoryId });
    if (bound) return { ok: false as const, error: bound };

    if (this.usingRemote) {
      if (!this.remoteReady) return { ok: false as const, error: this.hydrateError ?? '尚未同步遊戲資料' };
      const r = await remoteCapture(this.session, params);
      if (!r.ok) return r;
      await this.refreshFromRemote();
      return { ok: true as const, draw: r.draw, message: r.message, state: this.state };
    }
    const result = submitCapture(this.state, params);
    if (!result.ok) return result;
    await this.persistLocal(result.state);
    return result;
  }

  async obtain(smallTeamId: string, itemId: ItemId) {
    const bound = this.assertBinding({ smallTeamId });
    if (bound) return { ok: false as const, error: bound };

    if (this.usingRemote) {
      if (!this.remoteReady) return { ok: false as const, error: this.hydrateError ?? '尚未同步遊戲資料' };
      const r = await remoteObtain(this.session, smallTeamId, itemId);
      if (!r.ok) return r;
      await this.refreshFromRemote();
      return { ok: true as const, state: this.state };
    }
    const result = obtainItem(this.state, smallTeamId, itemId);
    if (!result.ok) return result;
    await this.persistLocal(result.state);
    return result;
  }

  async use(actorSmallTeamId: string, itemId: ItemId, targetSmallTeamId: string) {
    const bound = this.assertBinding({ actorSmallTeamId });
    if (bound) return { ok: false as const, error: bound };

    if (this.usingRemote) {
      if (!this.remoteReady) return { ok: false as const, error: this.hydrateError ?? '尚未同步遊戲資料' };
      const r = await remoteUseItem(this.session, actorSmallTeamId, itemId, targetSmallTeamId);
      if (!r.ok) return r;
      await this.refreshFromRemote();
      return { ok: true as const, bounced: r.bounced, state: this.state, message: r.message };
    }
    const result = useItem(this.state, { actorSmallTeamId, itemId, targetSmallTeamId });
    if (!result.ok) return result;
    await this.persistLocal(result.state);
    return result;
  }

  async broadcast(title: string, body: string) {
    if (this.usingRemote) {
      const r = await remoteBroadcast(this.session, title, body);
      if (!r.ok) throw new Error(r.error);
      await this.refreshFromRemote();
      return;
    }
    await this.persistLocal(postAnnouncement(this.state, title, body, 'broadcast'));
  }

  async setPaused(paused: boolean) {
    if (this.usingRemote) {
      const r = await remoteUpdateSettings(this.session, { paused });
      if (!r.ok) throw new Error(r.error);
      await this.refreshFromRemote();
      return;
    }
    await this.persistLocal({
      ...this.state,
      settings: { ...this.state.settings, paused },
      updatedAt: new Date().toISOString(),
    });
  }

  async setScoreFrozen(scoreFrozen: boolean) {
    if (this.usingRemote) {
      const r = await remoteUpdateSettings(this.session, { scoreFrozen });
      if (!r.ok) throw new Error(r.error);
      await this.refreshFromRemote();
      return;
    }
    await this.persistLocal({
      ...this.state,
      settings: { ...this.state.settings, scoreFrozen },
      updatedAt: new Date().toISOString(),
    });
  }

  async updateSettings(partial: Partial<GameState['settings']>) {
    if (this.usingRemote) {
      const r = await remoteUpdateSettings(this.session, {
        captureCutoff: partial.captureCutoff,
        itemCutoff: partial.itemCutoff,
        settleTime: partial.settleTime,
        huntDate: partial.huntDate,
        paused: partial.paused,
        scoreFrozen: partial.scoreFrozen,
      });
      if (!r.ok) throw new Error(r.error);
      await this.refreshFromRemote();
      return;
    }
    await this.persistLocal({
      ...this.state,
      settings: { ...this.state.settings, ...partial },
      updatedAt: new Date().toISOString(),
    });
  }

  async overrideTerritory(territoryId: number, patch: Partial<GameState['territories'][0]>) {
    if (this.usingRemote) {
      const r = await remoteOverrideTerritory(this.session, territoryId, {
        owner_big_team: patch.ownerBigTeam === undefined ? undefined : patch.ownerBigTeam,
        owner_small_team_id:
          patch.ownerSmallTeamId === undefined ? undefined : patch.ownerSmallTeamId,
        difficulty: patch.difficulty === undefined ? undefined : patch.difficulty,
        captured_at: patch.capturedAt === undefined ? undefined : patch.capturedAt,
        cooldown_until: patch.cooldownUntil === undefined ? undefined : patch.cooldownUntil,
        closed: patch.closed,
      });
      if (!r.ok) throw new Error(r.error);
      await this.refreshFromRemote();
      return;
    }
    const territories = this.state.territories.map((t) =>
      t.id === territoryId ? { ...t, ...patch } : t,
    );
    await this.persistLocal({
      ...this.state,
      territories,
      updatedAt: new Date().toISOString(),
    });
  }

  async setTeamFlags(
    smallTeamId: string,
    patch: Partial<Pick<GameState['smallTeams'][0], 'late' | 'taskIds' | 'bonusPoints' | 'hasJamYe'>>,
  ) {
    if (this.usingRemote) {
      const r = await remoteSetTeamFlags(this.session, smallTeamId, {
        late: patch.late,
        bonus_points: patch.bonusPoints,
        has_jam_ye: patch.hasJamYe,
      });
      if (!r.ok) throw new Error(r.error);
      await this.refreshFromRemote();
      return;
    }
    const smallTeams = this.state.smallTeams.map((st) =>
      st.id === smallTeamId ? { ...st, ...patch } : st,
    );
    await this.persistLocal({
      ...this.state,
      smallTeams,
      updatedAt: new Date().toISOString(),
    });
  }

  async grantRelic(smallTeamId: string, relic: 'Engine大粒嘢' | 'Jam野') {
    if (this.usingRemote) {
      const r = await remoteGrantRelic(this.session, smallTeamId, relic);
      if (!r.ok) return r;
      await this.refreshFromRemote();
      return { ok: true as const, state: this.state };
    }
    const result = grantRelic(this.state, smallTeamId, relic);
    if (!result.ok) return result;
    await this.persistLocal(result.state);
    return result;
  }

  async addBonus(smallTeamId: string, delta: number, reason: string) {
    if (this.usingRemote) {
      const r = await remoteAddBonus(this.session, smallTeamId, delta, reason);
      if (!r.ok) throw new Error(r.error);
      await this.refreshFromRemote();
      return;
    }
    await this.persistLocal(adjustBonus(this.state, smallTeamId, delta, reason));
  }

  async toggleEvent(eventId: string, active: boolean) {
    if (this.usingRemote) {
      const r = await remoteToggleEvent(this.session, eventId, active);
      if (!r.ok) throw new Error(r.error);
      await this.refreshFromRemote();
      return;
    }
    const events = this.state.events.map((e) =>
      e.id === eventId
        ? { ...e, active, startedAt: active ? new Date().toISOString() : e.startedAt }
        : e,
    );
    const ev = events.find((e) => e.id === eventId);
    let next = { ...this.state, events, updatedAt: new Date().toISOString() };
    if (ev && active) {
      next = postAnnouncement(next, `突發事件：${ev.title}`, ev.body, 'event');
    }
    await this.persistLocal(next);
  }

  async addCustomEvent(timeLabel: string, title: string, body: string) {
    if (this.usingRemote) {
      const r = await remoteAddCustomEvent(this.session, timeLabel, title, body);
      if (!r.ok) throw new Error(r.error);
      await this.refreshFromRemote();
      return;
    }
    const events = [
      ...this.state.events,
      { id: `${Date.now()}`, timeLabel, title, body, active: false },
    ];
    await this.persistLocal({
      ...this.state,
      events,
      updatedAt: new Date().toISOString(),
    });
  }

  scores() {
    return computeScores(this.state);
  }
}

export const gameStore = new GameStore();

export async function loginWithPin(params: {
  role: Session['role'];
  pin: string;
  bigTeam?: BigTeamCode;
  smallTeamNum?: number;
  territoryId?: number;
}): Promise<{ ok: true; session: Session } | { ok: false; error: string }> {
  if (isSupabaseConfigured) {
    try {
      return await remoteLogin(params);
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : '登入失敗' };
    }
  }

  const expected =
    params.role === 'player'
      ? DEFAULT_PINS.player
      : params.role === 'ec'
        ? DEFAULT_PINS.ec
        : params.role === 'oec'
          ? DEFAULT_PINS.oec
          : DEFAULT_PINS.admin;

  if (params.pin !== expected) return { ok: false, error: 'PIN 錯誤' };

  if (params.role === 'player' || params.role === 'ec') {
    if (!params.bigTeam || !params.smallTeamNum) {
      return { ok: false, error: '請選擇大組同細組' };
    }
    const id = `${params.bigTeam}${params.smallTeamNum}`;
    return {
      ok: true,
      session: {
        role: params.role,
        bigTeam: params.bigTeam,
        smallTeamNum: params.smallTeamNum,
        smallTeamId: id,
        displayName: params.role === 'ec' ? `EC ${id}` : id,
        pin: params.pin,
      },
    };
  }

  if (params.role === 'oec') {
    if (!params.territoryId) return { ok: false, error: '請選擇負責陣地' };
    const name =
      TERRITORIES.find((t) => t.id === params.territoryId)?.name ?? `T${params.territoryId}`;
    return {
      ok: true,
      session: {
        role: 'oec',
        territoryId: params.territoryId,
        displayName: `OEC · ${params.territoryId} ${name}`,
        pin: params.pin,
      },
    };
  }

  return {
    ok: true,
    session: { role: 'admin', displayName: 'OC Admin', pin: params.pin },
  };
}
