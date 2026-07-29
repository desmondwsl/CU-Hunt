import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth, useGameState, useScores } from '@/contexts/GameContext';
import { Colors, TeamColors } from '@/constants/Colors';
import { Button, Card, Field, Muted, Screen, Title } from '@/components/ui/Primitives';
import { gameStore } from '@/lib/gameStore';

function isHHMM(v: string) {
  return /^\d{1,2}:\d{2}$/.test(v);
}

function isDate(v: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(v);
}

export default function AdminDashboard() {
  const { logout } = useAuth();
  const state = useGameState();
  const { bigScores } = useScores();

  const [huntDate, setHuntDate] = useState(state.settings.huntDate);
  const [captureCutoff, setCaptureCutoff] = useState(state.settings.captureCutoff);
  const [itemCutoff, setItemCutoff] = useState(state.settings.itemCutoff);
  const [settleTime, setSettleTime] = useState(state.settings.settleTime);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setHuntDate(state.settings.huntDate);
    setCaptureCutoff(state.settings.captureCutoff);
    setItemCutoff(state.settings.itemCutoff);
    setSettleTime(state.settings.settleTime);
  }, [
    state.settings.huntDate,
    state.settings.captureCutoff,
    state.settings.itemCutoff,
    state.settings.settleTime,
  ]);

  const dirty =
    huntDate !== state.settings.huntDate ||
    captureCutoff !== state.settings.captureCutoff ||
    itemCutoff !== state.settings.itemCutoff ||
    settleTime !== state.settings.settleTime;

  const saveSetup = async () => {
    if (!isDate(huntDate)) {
      Alert.alert('日期格式錯誤', '請用 YYYY-MM-DD，例如 2026-08-20');
      return;
    }
    if (![captureCutoff, itemCutoff, settleTime].every(isHHMM)) {
      Alert.alert('時間格式錯誤', '請用 HH:mm，例如 18:25');
      return;
    }
    setSaving(true);
    try {
      await gameStore.updateSettings({
        huntDate,
        captureCutoff,
        itemCutoff,
        settleTime,
      });
      Alert.alert('已儲存開Camp設定');
    } catch (e) {
      Alert.alert('儲存失敗', e instanceof Error ? e.message : '未知錯誤');
    } finally {
      setSaving(false);
    }
  };

  const startGame = () => {
    Alert.alert('開始遊戲？', '會解除暫停，各站可以開始登記攻佔。', [
      { text: '取消', style: 'cancel' },
      {
        text: '開始',
        onPress: async () => {
          try {
            if (dirty) {
              if (!isDate(huntDate) || ![captureCutoff, itemCutoff, settleTime].every(isHHMM)) {
                Alert.alert('請先修正時間格式再開始');
                return;
              }
              await gameStore.updateSettings({
                huntDate,
                captureCutoff,
                itemCutoff,
                settleTime,
              });
            }
            await gameStore.setPaused(false);
            await gameStore.setScoreFrozen(false);
            Alert.alert('遊戲已開始');
          } catch (e) {
            Alert.alert('失敗', e instanceof Error ? e.message : '未知錯誤');
          }
        },
      },
    ]);
  };

  const resetGame = () => {
    Alert.alert(
      '確認重置？',
      '會清除所有佔領、錦囊、連結獎勵、廣播紀錄，並關閉進行中事件。時間設定會保留。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '重置',
          style: 'destructive',
          onPress: async () => {
            try {
              await gameStore.reset();
              await gameStore.setPaused(true);
              Alert.alert('已重置', '遊戲已暫停，請檢查時間後再按「開始遊戲」。');
            } catch (e) {
              Alert.alert('重置失敗', e instanceof Error ? e.message : '未知錯誤');
            }
          },
        },
      ],
    );
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 40 }}>
        <Title>OC Dashboard</Title>
        <Muted>
          {state.settings.paused ? '已暫停' : '進行中'} ·{' '}
          {state.settings.scoreFrozen ? '分數已凍結' : '分數累計中'} · 更新{' '}
          {new Date(state.updatedAt).toLocaleTimeString()}
        </Muted>

        <Card style={{ borderColor: Colors.accent, borderWidth: 1 }}>
          <Text style={styles.setupTitle}>開Camp設定</Text>
          <Muted>
            開Camp前先填日期同截止時間 → 重置乾淨狀態 → 到時間按開始。突發事件到點由 OC 喺「事件」頁手動啟動。
          </Muted>

          <Field
            label="Hunt 日期 YYYY-MM-DD"
            value={huntDate}
            onChangeText={setHuntDate}
            placeholder="2026-08-20"
          />
          <Field
            label="攻佔截止 HH:mm"
            value={captureCutoff}
            onChangeText={setCaptureCutoff}
            placeholder="18:25"
          />
          <Field
            label="錦囊 / Jam野 截止 HH:mm"
            value={itemCutoff}
            onChangeText={setItemCutoff}
            placeholder="18:00"
          />
          <Field
            label="分數結算 HH:mm"
            value={settleTime}
            onChangeText={setSettleTime}
            placeholder="18:45"
          />

          <Button
            label={saving ? '儲存中…' : dirty ? '儲存時間設定' : '時間設定已同步'}
            onPress={saveSetup}
            disabled={saving || !dirty}
          />
          <View style={{ height: 8 }} />
          <Button
            label={state.settings.paused ? '開始遊戲' : '遊戲進行中（再按可暫停）'}
            onPress={() => {
              if (state.settings.paused) startGame();
              else void gameStore.setPaused(true);
            }}
            variant={state.settings.paused ? 'primary' : 'danger'}
          />
          <View style={{ height: 8 }} />
          <Button
            label={state.settings.scoreFrozen ? '解除凍結分數' : '凍結分數'}
            variant="ghost"
            onPress={() => gameStore.setScoreFrozen(!state.settings.scoreFrozen)}
          />
          <View style={{ height: 8 }} />
          <Button label="重置全部遊戲資料" variant="danger" onPress={resetGame} />
        </Card>

        <Card>
          <Text style={styles.setupTitle}>突發事件清單</Text>
          <Muted>時間標籤只係提示；到點請去「事件」頁按啟動並廣播。</Muted>
          {state.events.length === 0 ? (
            <Muted>尚未有事件（可喺事件頁新增）</Muted>
          ) : (
            state.events.map((e) => (
              <View key={e.id} style={styles.eventRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.eventTitle}>
                    {e.timeLabel} · {e.title}
                  </Text>
                  <Muted>{e.body}</Muted>
                </View>
                <Text
                  style={{
                    color: e.active ? Colors.success : Colors.textMuted,
                    fontWeight: '800',
                    fontSize: 12,
                  }}
                >
                  {e.active ? '進行中' : '待命'}
                </Text>
              </View>
            ))
          )}
        </Card>

        <Text style={styles.section}>大組分數</Text>
        {bigScores.map((b) => (
          <Card key={b.code} style={{ borderLeftWidth: 4, borderLeftColor: TeamColors[b.code] }}>
            <Text style={{ color: Colors.text, fontWeight: '800', fontSize: 17 }}>
              {b.code} {b.fullName}
            </Text>
            <Text style={{ color: TeamColors[b.code], fontWeight: '900', fontSize: 24 }}>{b.total}</Text>
            <Muted>
              佔領 {b.heldCount} · 連結 +{b.linkageBonus} · 詛咒 {b.cursePenalty} · 事件 {b.eventPoints}
            </Muted>
          </Card>
        ))}

        <Text style={styles.section}>25 陣地狀態</Text>
        {state.territories.map((t) => (
          <Card key={t.id}>
            <Text style={{ color: Colors.text, fontWeight: '700' }}>
              {t.id}. {t.name}{' '}
              <Text style={{ color: t.ownerBigTeam ? TeamColors[t.ownerBigTeam] : Colors.textMuted }}>
                {t.ownerSmallTeamId ?? '空置'}
              </Text>
            </Text>
            <Muted>
              {t.difficulty ?? '—'}
              {t.cooldownUntil ? ` · CD ${new Date(t.cooldownUntil).toLocaleTimeString()}` : ''}
              {t.closed ? ' · 關閉' : ''}
            </Muted>
          </Card>
        ))}

        <Text style={styles.section}>最近攻佔</Text>
        {state.captures.slice(0, 15).map((c) => (
          <Card key={c.id}>
            <Muted>{new Date(c.at).toLocaleTimeString()}</Muted>
            <Text style={{ color: Colors.text }}>{c.message}</Text>
          </Card>
        ))}

        <Button label="登出" variant="ghost" onPress={logout} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  setupTitle: { color: Colors.text, fontWeight: '800', fontSize: 16, marginBottom: 8 },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  eventTitle: { color: Colors.text, fontWeight: '700', marginBottom: 2 },
  section: {
    color: Colors.text,
    fontWeight: '700',
    marginTop: 10,
    fontSize: 18,
    letterSpacing: -0.3,
  },
});
