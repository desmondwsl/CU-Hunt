import { Image, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useGameState } from '@/contexts/GameContext';
import { Colors, TeamColors } from '@/constants/Colors';
import { POINTS_PER_MIN } from '@/constants/territories';
import { Card, Muted, FullScreen, Title } from '@/components/ui/Primitives';

export default function TerritoryDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const state = useGameState();
  const t = state.territories.find((x) => x.id === Number(id));

  if (!t) {
    return (
      <FullScreen>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>← 返回</Text>
        </Pressable>
        <Title>找不到陣地</Title>
      </FullScreen>
    );
  }

  const cooling = t.cooldownUntil && new Date(t.cooldownUntil) > new Date();
  const color = t.ownerBigTeam ? TeamColors[t.ownerBigTeam] : TeamColors.empty;

  return (
    <FullScreen>
      <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 40 }}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>← 返回</Text>
        </Pressable>
        {!!t.imageUrl && (
          <Image source={{ uri: t.imageUrl }} style={styles.image} resizeMode="cover" />
        )}
        <Title>
          {t.id}. {t.name}
        </Title>
        <Text style={{ color, fontWeight: '800', fontSize: 16 }}>
          {t.ownerBigTeam ? `屬於 ${t.ownerSmallTeamId}（${t.difficulty === 'hard' ? '困難' : '簡單'}）` : '空置'}
        </Text>
        <Muted>
          {cooling
            ? `冷卻至 ${new Date(t.cooldownUntil!).toLocaleTimeString()}`
            : '現在可以挑戰'}
          {t.closed ? ' · 已關閉' : ''}
        </Muted>

        <Card>
          <Text style={styles.h}>考驗 · {t.taskName}</Text>
          <Text style={styles.li}>
            簡單（{POINTS_PER_MIN.easy}/分）：{t.easyRule}
          </Text>
          <Text style={styles.li}>
            困難（{POINTS_PER_MIN.hard}/分）：{t.hardRule}
          </Text>
        </Card>

        <Card>
          <Text style={styles.h}>連結</Text>
          <Text style={styles.li}>{t.linkage}</Text>
          {t.curse ? <Text style={[styles.li, { color: Colors.danger }]}>詛咒：{t.curse}</Text> : null}
        </Card>

        <Card>
          <Text style={styles.h}>雨程</Text>
          <Text style={styles.li}>{t.rainVenue}</Text>
        </Card>

        <Card>
          <Text style={styles.h}>位置</Text>
          <Muted>
            {t.lat.toFixed(5)}, {t.lng.toFixed(5)}
          </Muted>
        </Card>
      </ScrollView>
    </FullScreen>
  );
}

const styles = StyleSheet.create({
  back: { color: Colors.textMuted, fontWeight: '600', marginBottom: 8, fontSize: 15 },
  image: { width: '100%', height: 180, borderRadius: 14, backgroundColor: Colors.bgCard },
  h: { color: Colors.text, fontWeight: '800', marginBottom: 8 },
  li: { color: Colors.textMuted, lineHeight: 22, marginBottom: 4 },
});
