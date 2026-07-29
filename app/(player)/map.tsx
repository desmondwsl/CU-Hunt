import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGameState, useHydrateError } from '@/contexts/GameContext';
import { Colors, TeamColors } from '@/constants/Colors';
import { Card, Chip, Muted, Screen } from '@/components/ui/Primitives';
import { distanceMeters, getCurrentCoords } from '@/lib/location';
import type { TerritoryState } from '@/lib/types';

/** CUHK campus — covers all 25 seeded territories */
const CAMPUS_REGION: Region = {
  latitude: 22.4198,
  longitude: 114.2068,
  latitudeDelta: 0.018,
  longitudeDelta: 0.018,
};

type Filter = 'all' | 'empty' | '梟' | '焽' | '赬';
type Mode = 'map' | 'list';

function pinColor(t: TerritoryState): string {
  if (t.closed) return Colors.borderStrong;
  if (t.ownerBigTeam) return TeamColors[t.ownerBigTeam];
  return TeamColors.empty;
}

export default function MapScreen() {
  const state = useGameState();
  const hydrateError = useHydrateError();
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [mode, setMode] = useState<Mode>(Platform.OS === 'web' ? 'list' : 'map');
  const [nearest, setNearest] = useState<string | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  /** Custom markers need one paint pass before freezing for perf */
  const [trackPins, setTrackPins] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const coords = await getCurrentCoords();
      if (!coords || cancelled) return;
      setUserCoords(coords);
      let best: { id: number; name: string; d: number } | null = null;
      for (const t of state.territories) {
        const d = distanceMeters(coords, { lat: t.lat, lng: t.lng });
        if (!best || d < best.d) best = { id: t.id, name: t.name, d };
      }
      if (best) {
        setNearest(
          best.d < 800
            ? `附近：${best.id}. ${best.name}（約 ${Math.round(best.d)}m）`
            : `最近：${best.id}. ${best.name}（約 ${(best.d / 1000).toFixed(1)}km）`,
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [state.territories]);

  const list = useMemo(() => {
    return state.territories.filter((t) => {
      if (filter === 'all') return true;
      if (filter === 'empty') return !t.ownerBigTeam;
      return t.ownerBigTeam === filter;
    });
  }, [state.territories, filter]);

  useEffect(() => {
    setTrackPins(true);
    const t = setTimeout(() => setTrackPins(false), 600);
    return () => clearTimeout(t);
  }, [
    list
      .map((t) => `${t.id}:${t.ownerBigTeam ?? ''}:${t.closed ? 1 : 0}`)
      .join('|'),
  ]);

  const goToUser = () => {
    if (!userCoords || !mapRef.current) return;
    mapRef.current.animateToRegion(
      {
        latitude: userCoords.lat,
        longitude: userCoords.lng,
        latitudeDelta: 0.008,
        longitudeDelta: 0.008,
      },
      350,
    );
  };

  const fitCampus = () => {
    mapRef.current?.animateToRegion(CAMPUS_REGION, 350);
  };

  return (
    <Screen style={styles.screen}>
      {hydrateError ? (
        <Card style={{ marginBottom: 10, borderColor: Colors.danger }}>
          <Text style={{ color: Colors.danger, fontWeight: '800' }}>未能同步遊戲資料</Text>
          <Muted>{hydrateError}</Muted>
          <Muted>顯示可能不是即時狀態。請檢查網絡後重新整理 App。</Muted>
        </Card>
      ) : null}
      {state.settings.paused && (
        <Card style={{ marginBottom: 10, borderColor: Colors.danger }}>
          <Text style={{ color: Colors.danger, fontWeight: '800' }}>遊戲已暫停</Text>
          <Muted>請等待 OC 指示。</Muted>
        </Card>
      )}

      <View style={styles.toolbar}>
        <View style={styles.filters}>
          {(['all', 'empty', '梟', '焽', '赬'] as const).map((f) => (
            <Chip
              key={f}
              label={f === 'all' ? '全部' : f === 'empty' ? '空置' : f}
              selected={filter === f}
              color={f === '梟' || f === '焽' || f === '赬' ? TeamColors[f] : Colors.accent}
              onPress={() => setFilter(f)}
            />
          ))}
        </View>
        {Platform.OS !== 'web' && (
          <View style={styles.modeRow}>
            <Chip
              label="地圖"
              selected={mode === 'map'}
              color={Colors.accent}
              onPress={() => setMode('map')}
            />
            <Chip
              label="列表"
              selected={mode === 'list'}
              color={Colors.accent}
              onPress={() => setMode('list')}
            />
          </View>
        )}
      </View>

      {nearest ? (
        <View style={styles.nearest}>
          <Muted>{nearest}</Muted>
        </View>
      ) : null}

      {mode === 'map' && Platform.OS !== 'web' ? (
        <View style={styles.mapWrap}>
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFill}
            initialRegion={CAMPUS_REGION}
            showsUserLocation
            showsMyLocationButton={false}
            showsCompass={false}
            toolbarEnabled={false}
            mapPadding={{ top: 8, right: 8, bottom: 8, left: 8 }}
          >
            {list.map((t) => {
              const color = pinColor(t);
              const cooling =
                t.cooldownUntil && new Date(t.cooldownUntil) > new Date();
              return (
                <Marker
                  key={t.id}
                  coordinate={{ latitude: t.lat, longitude: t.lng }}
                  tracksViewChanges={trackPins}
                  title={`${t.id}. ${t.name}`}
                  description={
                    t.ownerBigTeam
                      ? `${t.ownerSmallTeamId}${cooling ? ' · 冷卻中' : ''}`
                      : t.closed
                        ? '已關閉'
                        : '空置'
                  }
                  onCalloutPress={() => router.push(`/territory/${t.id}`)}
                  onPress={() => router.push(`/territory/${t.id}`)}
                  anchor={{ x: 0.5, y: 0.5 }}
                >
                  <View style={[styles.pin, { backgroundColor: color, borderColor: Colors.white }]}>
                    <Text style={styles.pinText}>{t.id}</Text>
                  </View>
                </Marker>
              );
            })}
          </MapView>

          <View style={styles.mapActions}>
            <Pressable
              onPress={fitCampus}
              style={({ pressed }) => [styles.mapBtn, pressed && { opacity: 0.7 }]}
              accessibilityLabel="回到校園"
            >
              <Ionicons name="school-outline" size={20} color={Colors.text} />
            </Pressable>
            <Pressable
              onPress={goToUser}
              style={({ pressed }) => [styles.mapBtn, pressed && { opacity: 0.7 }]}
              accessibilityLabel="我的位置"
            >
              <Ionicons name="locate-outline" size={20} color={Colors.text} />
            </Pressable>
          </View>

          <View style={styles.legend}>
            {(['梟', '焽', '赬'] as const).map((team) => (
              <View key={team} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: TeamColors[team] }]} />
                <Text style={styles.legendText}>{team}</Text>
              </View>
            ))}
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: TeamColors.empty }]} />
              <Text style={styles.legendText}>空置</Text>
            </View>
          </View>
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ gap: 10, paddingBottom: 24 }}
          style={{ flex: 1 }}
          renderItem={({ item }) => {
            const cooling =
              item.cooldownUntil && new Date(item.cooldownUntil) > new Date();
            const color = pinColor(item);
            return (
              <Pressable onPress={() => router.push(`/territory/${item.id}`)}>
                <Card style={{ borderLeftWidth: 4, borderLeftColor: color }}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.name}>
                      {item.id}. {item.name}
                    </Text>
                    <Text style={[styles.badge, { color }]}>
                      {item.ownerBigTeam ? `${item.ownerSmallTeamId}` : '空置'}
                    </Text>
                  </View>
                  <Text style={styles.task}>{item.taskName}</Text>
                  <Muted>
                    {item.linkage}
                    {cooling
                      ? ` · 冷卻至 ${new Date(item.cooldownUntil!).toLocaleTimeString()}`
                      : ' · 可攻佔'}
                    {item.closed ? ' · 已關閉' : ''}
                  </Muted>
                </Card>
              </Pressable>
            );
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingBottom: 0 },
  toolbar: { gap: 8, marginBottom: 4 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  modeRow: { flexDirection: 'row', gap: 8 },
  nearest: { marginBottom: 8, marginTop: 4 },
  mapWrap: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bgElevated,
    marginBottom: 8,
  },
  pin: {
    minWidth: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    paddingHorizontal: 6,
  },
  pinText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '800',
  },
  mapActions: {
    position: 'absolute',
    right: 12,
    top: 12,
    gap: 8,
  },
  mapBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  legend: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: Colors.textMuted, fontSize: 11, fontWeight: '600' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { color: Colors.text, fontWeight: '800', fontSize: 16 },
  badge: { fontWeight: '800', fontSize: 14 },
  task: { color: Colors.accentSoft, marginTop: 6, fontWeight: '600', fontSize: 13 },
});
