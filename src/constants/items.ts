export type ItemId = 1 | 2 | 3 | 4 | 5 | 6;

export const ITEMS: Record<
  ItemId,
  { id: ItemId; name: string; description: string; isDefense?: boolean }
> = {
  1: {
    id: 1,
    name: '入中大就dem 個beat 啦',
    description:
      '（遇見敵對時使用）強控對面成個細組，去最近嘅一個書院範圍內 dem 屬於嗰個書院嘅其中一個 beat。',
  },
  2: {
    id: 2,
    name: '炎炎夏日消消暑',
    description:
      '（遇見敵對時使用）強制對面成個細組即刻出發去 Fusion 買雪條畀全組食。後備：到附近嘢飲機買飲品俾跟組 EC & 下一個領地嘅 OEC。',
  },
  3: {
    id: 3,
    name: 'Wèi Zhōng dà gōngchéng 喂 中大工程',
    description:
      '（遇見敵對時使用）強控對面成個細組原地 full dem 普通話版中大工程 beat（3 段）。',
  },
  4: {
    id: 4,
    name: '影幅相',
    description:
      '（遇見敵對時使用）強制對面成個細組，自己揀 3 張相，按照入面姿勢影相，影曬先走得，影完放上 EC grp。',
  },
  5: {
    id: 5,
    name: '676767',
    description:
      '（遇見敵對時使用）強制對面細組派 2 人和 2 位其他大組人或路人比拼 67，直至勝利先可以佔領領地。https://67speed.com/',
  },
  6: {
    id: 6,
    name: '閘住反彈',
    description: '（防禦對方錦囊時用）將對方錦囊效果反彈。',
    isDefense: true,
  },
};

/** 60% chance to draw nothing on capture */
export const MISS_DRAW_RATE = 0.6;
