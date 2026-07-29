import type { BigTeamCode } from './Colors';

export type LinkageId =
  | '新書院深度遊'
  | '我要上堂'
  | '放鬆時間'
  | '人文精神'
  | '你有你嘅健康，我有我嘅健康，我哋一齊活在香港'
  | '羅桂祥是個好地方';

export type CurseId = '尼斯湖水怪' | '百慕達三角洲';

export type TerritorySeed = {
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
};

export const POINTS_PER_MIN = { easy: 50, hard: 70 } as const;
export const COOLDOWN_MINUTES = 15;
export const LINKAGE_HOLD_MINUTES = 10;

export const LINKAGES: Record<
  LinkageId,
  {
    id: LinkageId;
    description: string;
    territoryIds: number[];
    tier2Count: number;
    tier2Bonus: number;
    tier1Bonus: number;
  }
> = {
  新書院深度遊: {
    id: '新書院深度遊',
    description: '恭喜你係知道自己入咩書院之前已經將中大五間新書院行晒',
    territoryIds: [2, 12, 20, 24, 21],
    tier2Count: 4,
    tier2Bonus: 3000,
    tier1Bonus: 5000,
  },
  我要上堂: {
    id: '我要上堂',
    description: '我真係好鍾意上堂',
    territoryIds: [9, 4, 6, 1, 19],
    tier2Count: 4,
    tier2Bonus: 3000,
    tier1Bonus: 5000,
  },
  放鬆時間: {
    id: '放鬆時間',
    description: '根據牛津詞典的說法，放鬆是指身體和心智都沒有緊張和焦慮。',
    territoryIds: [14, 3, 10, 15],
    tier2Count: 3,
    tier2Bonus: 2000,
    tier1Bonus: 3000,
  },
  人文精神: {
    id: '人文精神',
    description: '人文精神是一種普遍的人類自我關懷……',
    territoryIds: [5, 8, 7, 17, 25],
    tier2Count: 4,
    tier2Bonus: 4000,
    tier1Bonus: 5000,
  },
  '你有你嘅健康，我有我嘅健康，我哋一齊活在香港': {
    id: '你有你嘅健康，我有我嘅健康，我哋一齊活在香港',
    description: '你依家可能唔識，但係之後一定會識',
    territoryIds: [13, 11, 16, 18],
    tier2Count: 3,
    tier2Bonus: 3000,
    tier1Bonus: 4000,
  },
  羅桂祥是個好地方: {
    id: '羅桂祥是個好地方',
    description: '我講真㗎',
    territoryIds: [22, 23],
    tier2Count: 0,
    tier2Bonus: 0,
    tier1Bonus: 8000,
  },
};

export const CURSES: Record<
  CurseId,
  { id: CurseId; description: string; territoryIds: number[]; penalty: number }
> = {
  尼斯湖水怪: {
    id: '尼斯湖水怪',
    description: '遠離水域...',
    territoryIds: [21, 14, 5],
    penalty: -4000,
  },
  百慕達三角洲: {
    id: '百慕達三角洲',
    description: '小心同伴突然消失...',
    territoryIds: [11, 22, 1],
    penalty: -4000,
  },
};

export const TERRITORIES: TerritorySeed[] = [
  {
    id: 1,
    name: 'YIA G/F',
    lat: 22.41632,
    lng: 114.21098,
    imageUrl: 'https://drive.google.com/thumbnail?id=1x7Tcaj5541k95xni-BO12vawWhVs-N9G',
    linkage: '我要上堂',
    curse: '百慕達三角洲',
    taskName: '猜猜我是誰',
    easyRule: '猜中 5 個',
    hardRule: '猜中 10 個',
    rainVenue: 'YIA 有蓋位置',
  },
  {
    id: 2,
    name: '善草',
    lat: 22.41836,
    lng: 114.21015,
    imageUrl: 'https://drive.google.com/thumbnail?id=1sNgOueiccp27sWymhEXdm77Y9fCYxSzV',
    linkage: '新書院深度遊',
    taskName: '默數',
    easyRule: '±6 秒',
    hardRule: '±3 秒',
    rainVenue: '善衡書院宿舍正門外有蓋位置',
  },
  {
    id: 3,
    name: '禮拜堂',
    lat: 22.41597,
    lng: 114.20722,
    imageUrl: 'https://drive.google.com/thumbnail?id=1qp9R7i9ymNOLUMccxsVINmKFpI5uW7-d',
    linkage: '放鬆時間',
    taskName: '背金句',
    easyRule: '5 句',
    hardRule: '10 句',
    rainVenue: '禮拜堂建築物有蓋位置',
  },
  {
    id: 4,
    name: '新展（G/F外面）',
    lat: 22.41805,
    lng: 114.20809,
    imageUrl: 'https://drive.google.com/thumbnail?id=1OQ02CM4VRYtX3Cy0S9y5FEtKRKQp7pxz',
    linkage: '我要上堂',
    taskName: '合24',
    easyRule: '5 題',
    hardRule: '10 題',
    rainVenue: '新展有蓋位置',
  },
  {
    id: 5,
    name: '文廣',
    lat: 22.41857,
    lng: 114.20565,
    imageUrl: 'https://drive.google.com/thumbnail?id=1MfD-KA822Qyp-p5wuiyv2dk-wcEC3bQM',
    linkage: '人文精神',
    curse: '尼斯湖水怪',
    taskName: '默契接龍',
    easyRule: '完成 8 次',
    hardRule: '完成 12 次',
    rainVenue: 'Coffee Corner 門口',
  },
  {
    id: 6,
    name: 'LSK',
    lat: 22.41969,
    lng: 114.20393,
    imageUrl: 'https://drive.google.com/thumbnail?id=1xEkonWfRS5OhBBoQpeRowGBXC5TtctJW',
    linkage: '我要上堂',
    taskName: '單腳企',
    easyRule: '30 秒',
    hardRule: '1 分 15 秒',
    rainVenue: 'LSK 有蓋位置',
  },
  {
    id: 7,
    name: '張祝珊',
    lat: 22.42139,
    lng: 114.20566,
    imageUrl: 'https://drive.google.com/thumbnail?id=1FP4HZ5b3YC_T-ZoFIeFJL4UImIXehAla',
    linkage: '人文精神',
    taskName: '珍珠奶茶店',
    easyRule: '合共誤差 < $3',
    hardRule: '合共誤差 = $0',
    rainVenue: '張祝珊內大門附近',
  },
  {
    id: 8,
    name: '圓廣',
    lat: 22.42107,
    lng: 114.20827,
    imageUrl: 'https://drive.google.com/thumbnail?id=1x-qWl-u2Rx9lFGXGGrN6o9MGDPGttQRJ',
    linkage: '人文精神',
    taskName: '找找畢業生',
    easyRule: '10 分鐘內完成',
    hardRule: '6 分鐘內完成',
    rainVenue: '圓廣有蓋位置',
  },
  {
    id: 9,
    name: '蒙民偉7樓',
    lat: 22.42009,
    lng: 114.20918,
    imageUrl: 'https://drive.google.com/thumbnail?id=1tu8TBMgHN94oqJu10MqX6fhYhscPBDTw',
    linkage: '我要上堂',
    taskName: '疊羅漢',
    easyRule: '1 分 15 秒完成簡單題',
    hardRule: '45 秒完成困難題',
    rainVenue: '蒙民偉內大門附近',
  },
  {
    id: 10,
    name: '天人合一',
    lat: 22.42156,
    lng: 114.20987,
    imageUrl: 'https://drive.google.com/thumbnail?id=1vU-G8YZn-sCxacBNX13ZtmMlhqQuE3Yc',
    linkage: '放鬆時間',
    taskName: 'IG找圖',
    easyRule: '6 條',
    hardRule: '15 條',
    rainVenue: '落雨時暫時關閉',
  },
  {
    id: 11,
    name: '國平',
    lat: 22.42253,
    lng: 114.20109,
    imageUrl: 'https://drive.google.com/thumbnail?id=1zoekd2K6fUfFew1cQr1nZ3so9uxBYJvh',
    linkage: '你有你嘅健康，我有我嘅健康，我哋一齊活在香港',
    curse: '百慕達三角洲',
    taskName: '開合跳',
    easyRule: '180 下',
    hardRule: '300 下',
    rainVenue: '國平有蓋位置',
  },
  {
    id: 12,
    name: '敬文',
    lat: 22.42535,
    lng: 114.20647,
    imageUrl: 'https://drive.google.com/thumbnail?id=1kNry58UxkZL-MjBwn0iDDGCYtf11lXe7',
    linkage: '新書院深度遊',
    taskName: '茶餐廳',
    easyRule: '達標指定分數',
    hardRule: '達標指定分數',
    rainVenue: '敬文內大門附近',
  },
  {
    id: 13,
    name: 'IHouse籃球場',
    lat: 22.42351,
    lng: 114.20457,
    imageUrl: 'https://drive.google.com/thumbnail?id=1nRfdJKVcyIUh-h2s35sSHBhH8fEuXtEo',
    linkage: '你有你嘅健康，我有我嘅健康，我哋一齊活在香港',
    taskName: '射籃',
    easyRule: '五球',
    hardRule: '八球',
    rainVenue: '落雨時暫時關閉',
  },
  {
    id: 14,
    name: '獅子亭',
    lat: 22.41603,
    lng: 114.20931,
    imageUrl: 'https://drive.google.com/thumbnail?id=1-oej8Mbb0yhkjbkA_XJxjBzl-KwuSJ55',
    linkage: '放鬆時間',
    curse: '尼斯湖水怪',
    taskName: '過繩',
    easyRule: '五個人過到',
    hardRule: '全部人過到',
    rainVenue: '獅子亭有蓋位置',
  },
  {
    id: 15,
    name: '中大賓館',
    lat: 22.41977,
    lng: 114.21077,
    imageUrl: 'https://drive.google.com/thumbnail?id=1hjpBV5F0F2ShLOBfociC_sR7CHHXHgs3',
    linkage: '放鬆時間',
    taskName: '解手',
    easyRule: '1 分鐘',
    hardRule: '35 秒',
    rainVenue: '中大賓館有蓋位置',
  },
  {
    id: 16,
    name: '大學體育館門口',
    lat: 22.418724,
    lng: 114.211322,
    imageUrl: 'https://drive.google.com/thumbnail?id=12m6NarXLrxsz5iVBLYf37Z0Pv2qcxWlO',
    linkage: '你有你嘅健康，我有我嘅健康，我哋一齊活在香港',
    taskName: '掌上壓',
    easyRule: '人數 × 12',
    hardRule: '人數 × 20',
    rainVenue: '體育館門口有蓋位置',
  },
  {
    id: 17,
    name: '民女',
    lat: 22.413988,
    lng: 114.209698,
    imageUrl: 'https://drive.google.com/thumbnail?id=14UVhfOd5m3b_jHbiCMvldj7y-jH2Aim_',
    linkage: '人文精神',
    taskName: '估歌仔',
    easyRule: '8 首',
    hardRule: '15 首',
    rainVenue: '民女有蓋位置',
  },
  {
    id: 18,
    name: '保健梯',
    lat: 22.419273,
    lng: 114.209521,
    imageUrl: 'https://drive.google.com/thumbnail?id=1c68p9oQBS-C-MIJUoJMH9u77VTwdfntx',
    linkage: '你有你嘅健康，我有我嘅健康，我哋一齊活在香港',
    taskName: '跑樓梯',
    easyRule: '1 分 10 秒',
    hardRule: '45 秒',
    rainVenue: '落雨時暫時關閉',
  },
  {
    id: 19,
    name: '五平',
    lat: 22.418195,
    lng: 114.207337,
    imageUrl: 'https://drive.google.com/thumbnail?id=1lOg6jzeV9b7DSluS89igvrliKZM5_Ey1',
    linkage: '我要上堂',
    taskName: '畫畫接力',
    easyRule: '5 個',
    hardRule: '8 個',
    rainVenue: '五平有蓋位置',
  },
  {
    id: 20,
    name: '伍宜孫',
    lat: 22.422169,
    lng: 114.202551,
    imageUrl: 'https://drive.google.com/thumbnail?id=1ZPZXLug0vA7usJCHyLFiEFj6yzh_WXB4',
    linkage: '新書院深度遊',
    taskName: '默契考驗',
    easyRule: '2/5 題（3 次答錯機會）',
    hardRule: '4/7 題（3 次答錯機會）',
    rainVenue: '伍宜孫 Lobby',
  },
  {
    id: 21,
    name: '和聲',
    lat: 22.422327,
    lng: 114.204356,
    imageUrl: 'https://drive.google.com/thumbnail?id=1JnYuERjzOw5Nq8yUyVWSqqxH6NF661fm',
    linkage: '新書院深度遊',
    curse: '尼斯湖水怪',
    taskName: '無聲排隊',
    easyRule: '180 秒內排好',
    hardRule: '90 秒內排好',
    rainVenue: '和聲 Lobby',
  },
  {
    id: 22,
    name: '羅桂祥',
    lat: 22.427665,
    lng: 114.204063,
    imageUrl: 'https://drive.google.com/thumbnail?id=1PZmQNBwwRYfezqbXy8sSR2eA5_TPCPYL',
    linkage: '羅桂祥是個好地方',
    curse: '百慕達三角洲',
    taskName: '記憶迷宮',
    easyRule: '3 分鐘',
    hardRule: '1.5 分鐘',
    rainVenue: '羅桂祥有蓋位置',
  },
  {
    id: 23,
    name: '羅桂祥閣',
    lat: 22.418726,
    lng: 114.206165,
    imageUrl: 'https://drive.google.com/thumbnail?id=1qTkQH_FHoJvWbXlKrEvvf99i6EwfS0KR',
    linkage: '羅桂祥是個好地方',
    taskName: '拍照留念',
    easyRule: '1 分鐘',
    hardRule: '30 秒',
    rainVenue: '落雨時暫時關閉',
  },
  {
    id: 24,
    name: '晨興平台',
    lat: 22.419152,
    lng: 114.210416,
    imageUrl: 'https://drive.google.com/thumbnail?id=1-JJR18yyFjUwdddEopVzbnexuQlc0t4Y',
    linkage: '新書院深度遊',
    taskName: '快譯通',
    easyRule: '2 首歌',
    hardRule: '4 首歌',
    rainVenue: '晨興平台有蓋位置',
  },
  {
    id: 25,
    name: '崇基門迴旋處',
    lat: 22.414022,
    lng: 114.208283,
    imageUrl: 'https://drive.google.com/thumbnail?id=1dpg6_ggqWmqp8qYu4h46iPgp8J1u21B7',
    linkage: '人文精神',
    taskName: '歧視',
    easyRule: '七關或以下',
    hardRule: '八關全對',
    rainVenue: '利黃瑤璧樓玻璃門內',
  },
];

export const BIG_TEAMS: { code: BigTeamCode; fullName: string }[] = [
  { code: '梟', fullName: '巍梟壂' },
  { code: '焽', fullName: '翱焽烆' },
  { code: '赬', fullName: '玄暻赬' },
];

/** Default camp PINs — change in admin before hunt day */
export const DEFAULT_PINS = {
  player: '1234',
  ec: '2222',
  oec: '3333',
  admin: '9999',
};
