import type { BigTeamCode } from '@/constants/Colors';
import type { ItemId } from '@/constants/items';
import type { CurseId, LinkageId } from '@/constants/territories';

export type Role = 'player' | 'ec' | 'oec' | 'admin';
export type Difficulty = 'easy' | 'hard';

export type Session = {
  role: Role;
  bigTeam?: BigTeamCode;
  smallTeamNum?: number;
  smallTeamId?: string; // e.g. 赬3
  territoryId?: number; // for OEC
  displayName: string;
  /** Kept client-side after login; sent with write RPCs for server PIN checks */
  pin?: string;
};

export type TerritoryState = {
  id: number;
  name: string;
  lat: number;
  lng: number;
  imageUrl: string;
  linkage: LinkageId;
  curse?: CurseId;
  taskName: string;
  easyRule: string;
  hardRule: string;
  rainVenue: string;
  ownerBigTeam: BigTeamCode | null;
  ownerSmallTeamId: string | null;
  difficulty: Difficulty | null;
  capturedAt: string | null;
  cooldownUntil: string | null;
  closed: boolean;
};

export type SmallTeamState = {
  id: string;
  bigTeam: BigTeamCode;
  num: number;
  items: Record<ItemId, number>;
  taskIds: number[];
  late: boolean;
  territoryMinutesEasy: number;
  territoryMinutesHard: number;
  bonusPoints: number;
  hasJamYe: boolean;
  freeItemDraws: number;
};

export type BigTeamScore = {
  code: BigTeamCode;
  fullName: string;
  territoryPoints: number;
  linkageBonus: number;
  cursePenalty: number;
  eventPoints: number;
  total: number;
  heldCount: number;
};

export type CaptureEvent = {
  id: string;
  territoryId: number;
  territoryName: string;
  bigTeam: BigTeamCode;
  smallTeamId: string;
  difficulty: Difficulty;
  at: string;
  message: string;
  drawResult?: ItemId | 0; // 0 = 抽唔到
};

export type ItemEvent = {
  id: string;
  actorSmallTeamId: string;
  delta: 1 | -1;
  itemId: ItemId;
  targetSmallTeamId?: string;
  at: string;
  message: string;
  bounced?: boolean;
};

export type Announcement = {
  id: string;
  title: string;
  body: string;
  at: string;
  kind: 'broadcast' | 'event' | 'system';
};

export type GameEvent = {
  id: string;
  timeLabel: string;
  title: string;
  body: string;
  active: boolean;
  startedAt?: string;
};

export type GameSettings = {
  paused: boolean;
  scoreFrozen: boolean;
  captureCutoff: string; // HH:mm
  itemCutoff: string;
  settleTime: string;
  huntDate: string; // YYYY-MM-DD
  contacts: { role: string; name: string; phone: string }[];
};

export type LinkageAward = {
  bigTeam: BigTeamCode;
  linkageId: LinkageId;
  tier: 1 | 2;
  points: number;
  awardedAt: string;
};

export type CurseActive = {
  bigTeam: BigTeamCode;
  curseId: CurseId;
  points: number;
  since: string;
};

export type GameState = {
  settings: GameSettings;
  territories: TerritoryState[];
  smallTeams: SmallTeamState[];
  captures: CaptureEvent[];
  itemEvents: ItemEvent[];
  announcements: Announcement[];
  events: GameEvent[];
  linkageAwards: LinkageAward[];
  activeCurses: CurseActive[];
  updatedAt: string;
};
