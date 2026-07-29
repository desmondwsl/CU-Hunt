import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth, useGameState } from '@/contexts/GameContext';
import { Colors, TeamColors } from '@/constants/Colors';
import { ITEMS } from '@/constants/items';
import { BIG_TEAMS } from '@/constants/territories';
import { Button, Card, Chip, Muted, FullScreen, Title } from '@/components/ui/Primitives';
import { gameStore } from '@/lib/gameStore';
import type { Difficulty } from '@/lib/types';
import type { BigTeamCode } from '@/constants/Colors';

export default function OecStation() {
  const { session, logout } = useAuth();
  const state = useGameState();
  const territory = state.territories.find((t) => t.id === session?.territoryId);

  const [bigTeam, setBigTeam] = useState<BigTeamCode>('梟');
  const [num, setNum] = useState(1);
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [busy, setBusy] = useState(false);

  if (!territory) {
    return (
      <FullScreen>
        <Title>未設定陣地</Title>
        <Button label="登出" onPress={logout} />
      </FullScreen>
    );
  }

  const submit = async () => {
    setBusy(true);
    const smallTeamId = `${bigTeam}${num}`;
    const result = await gameStore.capture({
      territoryId: territory.id,
      smallTeamId,
      difficulty,
    });
    setBusy(false);
    if (!result.ok) {
      Alert.alert('無法攻佔', result.error);
      return;
    }
    const drawLabel =
      result.draw === 0 || result.draw === undefined
        ? '抽唔到'
        : ITEMS[result.draw as 1 | 2 | 3 | 4 | 5 | 6].name;
    const body =
      'message' in result && typeof result.message === 'string' && result.message
        ? result.message
        : `錦囊抽獎：${drawLabel}`;
    Alert.alert('攻佔成功', body);
  };

  const color = territory.ownerBigTeam ? TeamColors[territory.ownerBigTeam] : TeamColors.empty;
  const feed = state.announcements.slice(0, 6);

  return (
    <FullScreen>
      <ScrollView contentContainerStyle={{ gap: 14, paddingBottom: 40 }}>
        <View>
          <Muted>{session?.displayName}</Muted>
          <Title>
            {territory.id}. {territory.name}
          </Title>
          <Text style={{ color, fontWeight: '800' }}>
            {territory.ownerBigTeam
              ? `目前：${territory.ownerSmallTeamId}`
              : '目前：空置'}
          </Text>
          <Muted>
            考驗：{territory.taskName}
            {territory.cooldownUntil && new Date(territory.cooldownUntil) > new Date()
              ? ` · 冷卻至 ${new Date(territory.cooldownUntil).toLocaleTimeString()}`
              : ''}
          </Muted>
          <Muted>此帳號只能為本陣地登記攻佔</Muted>
        </View>

        {feed.length > 0 && (
          <Card>
            <Text style={styles.h}>最新廣播 / 系統</Text>
            {feed.map((a) => (
              <View key={a.id} style={styles.feedRow}>
                <Text style={styles.feedTitle}>{a.title}</Text>
                <Muted>{a.body}</Muted>
              </View>
            ))}
          </Card>
        )}

        <Card>
          <Text style={styles.h}>簡單 / 困難達標</Text>
          <Text style={styles.li}>簡單：{territory.easyRule}</Text>
          <Text style={styles.li}>困難：{territory.hardRule}</Text>
          <Muted>雨程：{territory.rainVenue}</Muted>
        </Card>

        <Card>
          <Text style={styles.h}>攻佔細組</Text>
          <View style={styles.row}>
            {BIG_TEAMS.map((b) => (
              <Chip
                key={b.code}
                label={b.code}
                selected={bigTeam === b.code}
                color={TeamColors[b.code]}
                onPress={() => setBigTeam(b.code)}
              />
            ))}
          </View>
          <View style={styles.row}>
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <Chip
                key={n}
                label={`${bigTeam}${n}`}
                selected={num === n}
                onPress={() => setNum(n)}
              />
            ))}
          </View>
          <View style={styles.row}>
            <Chip
              label="簡單"
              selected={difficulty === 'easy'}
              color={Colors.easy}
              onPress={() => setDifficulty('easy')}
            />
            <Chip
              label="困難"
              selected={difficulty === 'hard'}
              color={Colors.hard}
              onPress={() => setDifficulty('hard')}
            />
          </View>
          <Button label={busy ? '處理中…' : '確認攻佔'} onPress={submit} disabled={busy} />
        </Card>

        <Button label="登出" variant="ghost" onPress={logout} />
      </ScrollView>
    </FullScreen>
  );
}

const styles = StyleSheet.create({
  h: { color: Colors.text, fontWeight: '800', marginBottom: 10, fontSize: 15 },
  li: { color: Colors.text, marginBottom: 6, lineHeight: 20 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  feedRow: { marginBottom: 10, gap: 2 },
  feedTitle: { color: Colors.text, fontWeight: '700', fontSize: 13 },
});
