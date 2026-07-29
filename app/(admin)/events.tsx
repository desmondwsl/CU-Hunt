import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Chip, Field, Muted, Screen, Title } from '@/components/ui/Primitives';
import { Colors, TeamColors } from '@/constants/Colors';
import { gameStore } from '@/lib/gameStore';
import { useGameState } from '@/contexts/GameContext';
import { notifyLocal } from '@/lib/notifications';
import type { BigTeamCode } from '@/constants/Colors';

export default function EventsScreen() {
  const state = useGameState();
  const [team, setTeam] = useState<BigTeamCode>('梟');
  const [num, setNum] = useState(1);
  const [bonus, setBonus] = useState('1000');
  const [reason, setReason] = useState('突發事件獎勵');
  const [customTime, setCustomTime] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [customBody, setCustomBody] = useState('');

  const smallId = `${team}${num}`;

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ gap: 14, paddingBottom: 40 }}>
        <Title>突發事件 / 聖物</Title>

        {state.events.map((e) => (
          <Card key={e.id}>
            <Text style={{ color: Colors.text, fontWeight: '700' }}>
              {e.timeLabel} · {e.title}
            </Text>
            <Muted>{e.body}</Muted>
            <View style={{ marginTop: 10 }}>
              <Button
                label={e.active ? '進行中（再按關閉）' : '啟動並廣播'}
                variant={e.active ? 'ghost' : 'primary'}
                onPress={async () => {
                  await gameStore.toggleEvent(e.id, !e.active);
                  if (!e.active) await notifyLocal(`突發：${e.title}`, e.body);
                }}
              />
            </View>
          </Card>
        ))}

        <Card>
          <Text style={styles.h}>新增自訂事件</Text>
          <Field label="時間標籤" value={customTime} onChangeText={setCustomTime} placeholder="18:10" />
          <Field label="標題" value={customTitle} onChangeText={setCustomTitle} />
          <Field label="內容" value={customBody} onChangeText={setCustomBody} />
          <Button
            label="加入"
            onPress={async () => {
              if (!customTitle) return Alert.alert('請填標題');
              await gameStore.addCustomEvent(customTime || 'TBD', customTitle, customBody);
              setCustomTime('');
              setCustomTitle('');
              setCustomBody('');
            }}
          />
        </Card>

        <Card>
          <Text style={styles.h}>授予聖物</Text>
          <View style={styles.row}>
            {(['梟', '焽', '赬'] as const).map((b) => (
              <Chip key={b} label={b} selected={team === b} color={TeamColors[b]} onPress={() => setTeam(b)} />
            ))}
          </View>
          <View style={styles.row}>
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <Chip key={n} label={`${team}${n}`} selected={num === n} onPress={() => setNum(n)} />
            ))}
          </View>
          <Button
            label={`畀 ${smallId} Engine大粒嘢`}
            onPress={async () => {
              const r = await gameStore.grantRelic(smallId, 'Engine大粒嘢');
              if (!r.ok) Alert.alert(r.error);
              else Alert.alert('已授予');
            }}
          />
          <View style={{ height: 8 }} />
          <Button
            label={`畀 ${smallId} Jam野`}
            variant="ghost"
            onPress={async () => {
              const r = await gameStore.grantRelic(smallId, 'Jam野');
              if (!r.ok) Alert.alert(r.error);
              else Alert.alert('已授予');
            }}
          />
        </Card>

        <Card>
          <Text style={styles.h}>加減分數</Text>
          <Field label="分數（可負數）" value={bonus} onChangeText={setBonus} keyboardType="number-pad" />
          <Field label="原因" value={reason} onChangeText={setReason} />
          <Button
            label={`套用到 ${smallId}`}
            onPress={async () => {
              const delta = Number(bonus);
              if (Number.isNaN(delta)) return Alert.alert('分數無效');
              await gameStore.addBonus(smallId, delta, reason || '手動調整');
              Alert.alert('已調整');
            }}
          />
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  h: { color: Colors.text, fontWeight: '800', marginBottom: 10, fontSize: 15 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
});
