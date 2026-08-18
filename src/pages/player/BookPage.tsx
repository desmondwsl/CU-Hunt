import type { CSSProperties } from 'react';
import { HUNTBOOK } from '@/constants/huntbook';
import { Colors } from '@/constants/Colors';
import { Card, Muted, Screen, Title } from '@/components/ui/Primitives';
import { useGameState } from '@/contexts/GameContext';
import { CURSES, LINKAGES } from '@/constants/territories';
import { ITEMS, type ItemId } from '@/constants/items';

function Section({ title, items }: { title: string; items: string[] }) {
  return (
    <Card>
      <p style={hStyle}>{title}</p>
      {items.map((t, i) => (
        <p key={i} style={liStyle}>
          • {t}
        </p>
      ))}
    </Card>
  );
}

export default function BookPage() {
  const state = useGameState();
  return (
    <Screen tabs>
      <div className="stack-gap" style={{ gap: 12, paddingBottom: 48 }}>
        <Title>{HUNTBOOK.title}</Title>
        <Muted>
          攻佔截止 {state.settings.captureCutoff} · 錦囊截止 {state.settings.itemCutoff} · 結算{' '}
          {state.settings.settleTime}
          {state.settings.huntDate ? ` · 日期 ${state.settings.huntDate}` : ''}
        </Muted>

        <Section title="注意事項" items={HUNTBOOK.safety} />
        <Section title="玩法" items={HUNTBOOK.gameplay} />
        <Section title="規則" items={HUNTBOOK.rules} />
        <Section title="連結／詛咒" items={HUNTBOOK.linkageCurseRules} />

        <Card>
          <p style={hStyle}>連結一覽</p>
          {Object.values(LINKAGES).map((l) => (
            <p key={l.id} style={liStyle}>
              <span style={{ color: Colors.text, fontWeight: 700 }}>{l.id}</span>
              <br />
              陣地 #{l.territoryIds.join(', #')}
              <br />
              {l.tier2Count > 0
                ? `T2 佔 ${l.tier2Count} 個 → +${l.tier2Bonus}　·　T1 全佔 → +${l.tier1Bonus}`
                : `T1 全佔 → +${l.tier1Bonus}`}
            </p>
          ))}
        </Card>

        <Card>
          <p style={hStyle}>詛咒一覽</p>
          {Object.values(CURSES).map((c) => (
            <p key={c.id} style={liStyle}>
              <span style={{ color: Colors.danger, fontWeight: 700 }}>{c.id}</span>
              <br />
              {c.description}
              <br />
              陣地 #{c.territoryIds.join(', #')}　·　生效中 {c.penalty}
            </p>
          ))}
        </Card>

        <Section title="錦囊牌規則" items={HUNTBOOK.itemRules} />

        <Card>
          <p style={hStyle}>錦囊牌一覽</p>
          <Muted>攻佔成功後隨機抽取 · 60% 抽唔到</Muted>
          {(Object.keys(ITEMS) as unknown as ItemId[]).map((id) => (
            <p key={id} style={liStyle}>
              <span style={{ color: Colors.text, fontWeight: 700 }}>
                #{id} {ITEMS[id].name}
                {ITEMS[id].isDefense ? '（防禦）' : ''}
              </span>
              <br />
              {ITEMS[id].description}
            </p>
          ))}
          <p style={liStyle}>
            <span style={{ color: Colors.textMuted, fontWeight: 700 }}>抽唔到</span>
            <br />
            恭喜你抽唔到...
          </p>
        </Card>

        <Card>
          <p style={hStyle}>惡劣天氣</p>
          <p style={liStyle}>{HUNTBOOK.weather}</p>
        </Card>

        <Card>
          <p style={hStyle}>聯絡</p>
          {HUNTBOOK.contacts.map((c) => (
            <p key={c.phone} style={liStyle}>
              {c.role} {c.name} · {c.phone}
            </p>
          ))}
        </Card>

        <Card>
          <p style={hStyle}>聖物</p>
          {HUNTBOOK.relics.map((r) => (
            <p key={r.name} style={liStyle}>
              <span style={{ color: Colors.accentWarm, fontWeight: 700 }}>{r.name}</span> —{' '}
              {r.description}
            </p>
          ))}
        </Card>

        <Card>
          <p style={hStyle}>突發事件預告</p>
          {(state.events.length ? state.events : HUNTBOOK.events.map((e) => ({
            id: e.title,
            timeLabel: e.time,
            title: e.title,
            body: e.body,
            place: e.place,
          }))).map((e) => (
            <p key={e.id} style={liStyle}>
              {e.timeLabel} {e.title}
              {e.place ? ` · ${e.place}` : ''}
              ：{e.body}
            </p>
          ))}
        </Card>

        <p style={{ ...hStyle, marginTop: 8 }}>Beat 詞大全</p>
        {HUNTBOOK.beats.map((b) => (
          <Card key={b.college}>
            <p style={{ margin: 0, color: Colors.text, fontWeight: 700 }}>{b.college}</p>
            <p style={{ margin: '8px 0 0', color: Colors.textMuted, lineHeight: '22px' }}>{b.lyrics}</p>
          </Card>
        ))}
      </div>
    </Screen>
  );
}

const hStyle: CSSProperties = {
  color: Colors.text,
  fontWeight: 800,
  margin: '0 0 8px',
  fontSize: 16,
};

const liStyle: CSSProperties = {
  color: Colors.textMuted,
  lineHeight: '22px',
  margin: '0 0 6px',
};
