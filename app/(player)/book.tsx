import { ScrollView, StyleSheet, Text } from 'react-native';
import { HUNTBOOK } from '@/constants/huntbook';
import { Colors } from '@/constants/Colors';
import { Card, Muted, Screen, Title } from '@/components/ui/Primitives';
import { useGameState } from '@/contexts/GameContext';
import { CURSES, LINKAGES } from '@/constants/territories';
import { ITEMS, type ItemId } from '@/constants/items';

function Section({ title, items }: { title: string; items: string[] }) {
  return (
    <Card>
      <Text style={styles.h}>{title}</Text>
      {items.map((t, i) => (
        <Text key={i} style={styles.li}>
          • {t}
        </Text>
      ))}
    </Card>
  );
}

export default function BookScreen() {
  const state = useGameState();
  return (
    <Screen>
      <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 48 }}>
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
          <Text style={styles.h}>連結一覽</Text>
          {Object.values(LINKAGES).map((l) => (
            <Text key={l.id} style={styles.li}>
              <Text style={{ color: Colors.text, fontWeight: '700' }}>{l.id}</Text>
              {'\n'}
              陣地 #{l.territoryIds.join(', #')}
              {'\n'}
              {l.tier2Count > 0
                ? `T2 佔 ${l.tier2Count} 個 → +${l.tier2Bonus}　·　T1 全佔 → +${l.tier1Bonus}`
                : `T1 全佔 → +${l.tier1Bonus}`}
            </Text>
          ))}
        </Card>

        <Card>
          <Text style={styles.h}>詛咒一覽</Text>
          {Object.values(CURSES).map((c) => (
            <Text key={c.id} style={styles.li}>
              <Text style={{ color: Colors.danger, fontWeight: '700' }}>{c.id}</Text>
              {'\n'}
              {c.description}
              {'\n'}
              陣地 #{c.territoryIds.join(', #')}　·　生效中 {c.penalty}
            </Text>
          ))}
        </Card>

        <Section title="錦囊牌規則" items={HUNTBOOK.itemRules} />

        <Card>
          <Text style={styles.h}>錦囊牌一覽</Text>
          <Muted>攻佔成功後隨機抽取 · 60% 抽唔到</Muted>
          {(Object.keys(ITEMS) as unknown as ItemId[]).map((id) => (
            <Text key={id} style={styles.li}>
              <Text style={{ color: Colors.text, fontWeight: '700' }}>
                #{id} {ITEMS[id].name}
                {ITEMS[id].isDefense ? '（防禦）' : ''}
              </Text>
              {'\n'}
              {ITEMS[id].description}
            </Text>
          ))}
          <Text style={styles.li}>
            <Text style={{ color: Colors.textMuted, fontWeight: '700' }}>抽唔到</Text>
            {'\n'}
            恭喜你抽唔到...
          </Text>
        </Card>

        <Card>
          <Text style={styles.h}>惡劣天氣</Text>
          <Text style={styles.li}>{HUNTBOOK.weather}</Text>
        </Card>

        <Card>
          <Text style={styles.h}>聯絡</Text>
          {HUNTBOOK.contacts.map((c) => (
            <Text key={c.phone} style={styles.li}>
              {c.role} {c.name} · {c.phone}
            </Text>
          ))}
        </Card>

        <Card>
          <Text style={styles.h}>聖物</Text>
          {HUNTBOOK.relics.map((r) => (
            <Text key={r.name} style={styles.li}>
              <Text style={{ color: Colors.accentWarm, fontWeight: '700' }}>{r.name}</Text> —{' '}
              {r.description}
            </Text>
          ))}
        </Card>

        <Card>
          <Text style={styles.h}>突發事件預告</Text>
          {HUNTBOOK.events.map((e) => (
            <Text key={e.time} style={styles.li}>
              {e.time} {e.title}：{e.body}
            </Text>
          ))}
        </Card>

        <Text style={[styles.h, { marginTop: 8 }]}>Beat 詞大全</Text>
        {HUNTBOOK.beats.map((b) => (
          <Card key={b.college}>
            <Text style={{ color: Colors.text, fontWeight: '700' }}>{b.college}</Text>
            <Text style={styles.lyrics}>{b.lyrics}</Text>
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  h: { color: Colors.text, fontWeight: '800', marginBottom: 8, fontSize: 16 },
  li: { color: Colors.textMuted, lineHeight: 22, marginBottom: 6 },
  lyrics: { color: Colors.textMuted, marginTop: 8, lineHeight: 22 },
});
