import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth, useGameState, useScores } from '@/contexts/GameContext';
import { Colors, TeamColors } from '@/constants/Colors';
import { ITEMS, type ItemId } from '@/constants/items';
import { MIN_TASKS } from '@/constants/huntbook';
import { Button, Card, Chip, Muted, Screen, Title } from '@/components/ui/Primitives';
import { gameStore } from '@/lib/gameStore';
import { BIG_TEAMS } from '@/constants/territories';

export default function TeamScreen() {
  const { session, logout } = useAuth();
  const state = useGameState();
  const { smallScores } = useScores();
  const team = state.smallTeams.find((t) => t.id === session?.smallTeamId);
  const score = smallScores.find((s) => s.id === session?.smallTeamId);
  const isEc = session?.role === 'ec';

  const [itemId, setItemId] = useState<ItemId>(1);
  const [targetBig, setTargetBig] = useState<'梟' | '焽' | '赬'>('焽');
  const [targetNum, setTargetNum] = useState(1);
  const [mode, setMode] = useState<'obtain' | 'use'>('use');

  if (!team || !session?.smallTeamId) {
    return (
      <Screen>
        <Title>未選擇細組</Title>
      </Screen>
    );
  }

  const onItemAction = async () => {
    if (!isEc) {
      Alert.alert('需要跟組 EC', '只有跟組 EC 可以登錄／使用錦囊。');
      return;
    }
    if (mode === 'obtain') {
      const r = await gameStore.obtain(team.id, itemId);
      if (!r.ok) Alert.alert('失敗', r.error);
      else Alert.alert('成功', `獲得「${ITEMS[itemId].name}」`);
      return;
    }
    const target = `${targetBig}${targetNum}`;
    const r = await gameStore.use(team.id, itemId, target);
    if (!r.ok) Alert.alert('失敗', r.error);
    else {
      const msg =
        'message' in r && r.message
          ? r.message
          : 'state' in r && r.state.itemEvents[0]?.message
            ? r.state.itemEvents[0].message
            : '';
      Alert.alert(r.bounced ? '被反彈！' : '已使用', msg);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ gap: 14, paddingBottom: 40 }}>
        <View>
          <Title>{team.id}</Title>
          <Text style={{ color: TeamColors[team.bigTeam], fontWeight: '800', fontSize: 16 }}>
            {BIG_TEAMS.find((b) => b.code === team.bigTeam)?.fullName}
          </Text>
          <Muted>
            分數 {score?.score ?? 0} · Task {team.taskIds.length}/{MIN_TASKS}
            {team.hasJamYe ? ' · 持有 Jam野' : ''}
          </Muted>
          {isEc ? <Muted>EC 只能為本細組登錄／使用錦囊</Muted> : null}
        </View>

        <Card>
          <Text style={styles.h}>已完成陣地</Text>
          <Muted>{team.taskIds.length ? team.taskIds.map((id) => `#${id}`).join('  ') : '尚未完成'}</Muted>
        </Card>

        <Card>
          <Text style={styles.h}>錦囊庫存</Text>
          {(Object.keys(ITEMS) as unknown as ItemId[]).map((id) => (
            <View key={id} style={styles.itemRow}>
              <Text style={{ color: Colors.text, flex: 1 }}>
                {id}. {ITEMS[id].name}
              </Text>
              <Text style={{ color: Colors.accent, fontWeight: '800' }}>×{team.items[id]}</Text>
            </View>
          ))}
        </Card>

        {isEc && (
          <Card>
            <Text style={styles.h}>錦囊操作（EC）</Text>
            <View style={styles.row}>
              <Chip label="使用" selected={mode === 'use'} onPress={() => setMode('use')} />
              <Chip label="獲得" selected={mode === 'obtain'} onPress={() => setMode('obtain')} />
            </View>
            <View style={styles.row}>
              {(Object.keys(ITEMS) as unknown as ItemId[]).map((id) => (
                <Chip
                  key={id}
                  label={`${id}`}
                  selected={itemId === id}
                  onPress={() => setItemId(id)}
                />
              ))}
            </View>
            <Muted>{ITEMS[itemId].description}</Muted>
            {mode === 'use' && (
              <>
                <Text style={[styles.h, { marginTop: 10 }]}>目標細組</Text>
                <View style={styles.row}>
                  {(['梟', '焽', '赬'] as const).map((b) => (
                    <Chip
                      key={b}
                      label={b}
                      selected={targetBig === b}
                      color={TeamColors[b]}
                      onPress={() => setTargetBig(b)}
                    />
                  ))}
                </View>
                <View style={styles.row}>
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <Chip
                      key={n}
                      label={`${targetBig}${n}`}
                      selected={targetNum === n}
                      onPress={() => setTargetNum(n)}
                    />
                  ))}
                </View>
              </>
            )}
            <Button label={mode === 'obtain' ? '登記獲得' : '發動錦囊'} onPress={onItemAction} />
          </Card>
        )}

        <Button label="登出" variant="ghost" onPress={logout} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  h: { color: Colors.text, fontWeight: '800', marginBottom: 8, fontSize: 15 },
  itemRow: { flexDirection: 'row', paddingVertical: 6, gap: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
});
