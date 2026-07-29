import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth, useGameState, useScores } from '@/contexts/GameContext';
import { Colors, TeamColors } from '@/constants/Colors';
import { Card, Muted, Screen, Title } from '@/components/ui/Primitives';
import { LINKAGES, CURSES } from '@/constants/territories';

export default function ScoresScreen() {
  const { session } = useAuth();
  const { bigScores, smallScores } = useScores();
  const state = useGameState();
  const myTeamId = session?.smallTeamId;
  const myBig = session?.bigTeam;

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ gap: 14, paddingBottom: 40 }}>
        <Title>實時分數</Title>
        <Muted>
          結算 {state.settings.settleTime}
          {state.settings.scoreFrozen ? ' · 已凍結' : ' · 每分鐘累計中'}
        </Muted>

        {bigScores.map((b, i) => {
          const mine = myBig === b.code;
          return (
            <Card
              key={b.code}
              style={{
                borderLeftWidth: 5,
                borderLeftColor: TeamColors[b.code],
                ...(mine ? { borderColor: TeamColors[b.code], borderWidth: 1.5 } : null),
              }}
            >
              <View style={styles.row}>
                <Text style={styles.rank}>#{i + 1}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.big}>
                    {b.code} {b.fullName}
                    {mine ? ' · 我哋' : ''}
                  </Text>
                  <Muted>
                    陣地 {b.heldCount} · 連結 +{b.linkageBonus} · 詛咒 {b.cursePenalty}
                  </Muted>
                </View>
                <Text style={[styles.total, { color: TeamColors[b.code] }]}>{b.total}</Text>
              </View>
            </Card>
          );
        })}

        <Text style={styles.section}>細組排行</Text>
        {[...smallScores]
          .sort((a, b) => b.score - a.score)
          .slice(0, 18)
          .map((s, i) => {
            const mine = myTeamId === s.id;
            return (
              <Card
                key={s.id}
                style={
                  mine
                    ? { borderColor: TeamColors[s.bigTeam], borderWidth: 1.5 }
                    : undefined
                }
              >
                <View style={styles.row}>
                  <Text style={styles.rank}>#{i + 1}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: Colors.text, fontWeight: mine ? '800' : '700' }}>
                      {s.id}
                      {mine ? ' · 我哋' : ''}
                    </Text>
                    <Muted>
                      簡單 {s.easyMin}m · 困難 {s.hardMin}m · Task {s.taskIds.length}/12
                      {s.late ? ' · 遲交' : ''}
                    </Muted>
                  </View>
                  <Text style={{ color: TeamColors[s.bigTeam], fontWeight: '800', fontSize: 18 }}>
                    {s.score}
                  </Text>
                </View>
              </Card>
            );
          })}

        <Text style={styles.section}>連結／詛咒進度</Text>
        {Object.values(LINKAGES).map((l) => {
          const held = myBig
            ? l.territoryIds.filter(
                (id) => state.territories.find((t) => t.id === id)?.ownerBigTeam === myBig,
              ).length
            : null;
          const awarded = state.linkageAwards.filter(
            (a) => a.linkageId === l.id && (!myBig || a.bigTeam === myBig),
          );
          return (
            <Card key={l.id}>
              <Text style={{ color: Colors.text, fontWeight: '700' }}>{l.id}</Text>
              <Muted>
                T2 {l.tier2Count || '—'} → +{l.tier2Bonus} · T1 全佔 → +{l.tier1Bonus}
              </Muted>
              <Muted>陣地：{l.territoryIds.join(', ')}</Muted>
              {held != null && (
                <Muted>
                  我哋大組已佔 {held}/{l.territoryIds.length}
                  {awarded.length
                    ? ` · 已獎勵 ${awarded.map((a) => `T${a.tier}`).join('/')}`
                    : ' · 尚未達標'}
                </Muted>
              )}
            </Card>
          );
        })}
        {Object.values(CURSES).map((c) => {
          const active = state.activeCurses.find(
            (a) => a.curseId === c.id && (!myBig || a.bigTeam === myBig),
          );
          const held = myBig
            ? c.territoryIds.filter(
                (id) => state.territories.find((t) => t.id === id)?.ownerBigTeam === myBig,
              ).length
            : null;
          return (
            <Card key={c.id}>
              <Text style={{ color: Colors.danger, fontWeight: '700' }}>詛咒 · {c.id}</Text>
              <Muted>
                {c.description} · {c.penalty} · 陣地 {c.territoryIds.join(', ')}
              </Muted>
              {held != null && (
                <Muted>
                  我哋大組已佔 {held}/{c.territoryIds.length}
                  {active ? ` · 生效中 ${active.points}` : ''}
                </Muted>
              )}
            </Card>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rank: { color: Colors.textMuted, fontWeight: '800', width: 28 },
  big: { color: Colors.text, fontWeight: '800', fontSize: 17 },
  total: { fontWeight: '900', fontSize: 22 },
  section: {
    color: Colors.text,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 2,
    fontSize: 18,
    letterSpacing: -0.3,
  },
});
