import { createElement, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useGameState, useHydrateError } from '@/contexts/GameContext';
import { Colors, TeamColors } from '@/constants/Colors';
import { Card, Chip, Muted, Screen } from '@/components/ui/Primitives';
import { distanceMeters, getCurrentCoords } from '@/lib/location';
import type { TerritoryState } from '@/lib/types';

type Filter = 'all' | 'empty' | '梟' | '焽' | '赬';
type Mode = 'map' | 'list';

const CAMPUS = { lat: 22.4198, lng: 114.2068, zoom: 15 };

function pinColor(t: TerritoryState): string {
  if (t.closed) return Colors.borderStrong;
  if (t.ownerBigTeam) return TeamColors[t.ownerBigTeam];
  return TeamColors.empty;
}

function WebCampusMap({
  territories,
  userCoords,
  onSelect,
}: {
  territories: TerritoryState[];
  userCoords: { lat: number; lng: number } | null;
  onSelect: (id: number) => void;
}) {
  const [mapReady, setMapReady] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import('leaflet').Map | null>(null);
  const markersRef = useRef<import('leaflet').LayerGroup | null>(null);
  const userMarkerRef = useRef<import('leaflet').CircleMarker | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (typeof window === 'undefined' || !containerRef.current) return;
      const L = (await import('leaflet')).default;
      if (!document.getElementById('cuhunt-leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'cuhunt-leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }
      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, {
        center: [CAMPUS.lat, CAMPUS.lng],
        zoom: CAMPUS.zoom,
        zoomControl: true,
      });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);
      markersRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      setMapReady(true);
      setTimeout(() => map.invalidateSize(), 80);
    })();

    return () => {
      cancelled = true;
      setMapReady(false);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markersRef.current = null;
        userMarkerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapReady) return;
    (async () => {
      const map = mapRef.current;
      const group = markersRef.current;
      if (!map || !group) return;
      const L = (await import('leaflet')).default;
      group.clearLayers();
      for (const t of territories) {
        const color = pinColor(t);
        const marker = L.circleMarker([t.lat, t.lng], {
          radius: 11,
          color: '#fff',
          weight: 2,
          fillColor: color,
          fillOpacity: 1,
        });
        marker.bindTooltip(`${t.id}. ${t.name}`, { direction: 'top', offset: [0, -8] });
        marker.on('click', () => onSelectRef.current(t.id));
        marker.addTo(group);
      }
    })();
  }, [territories, mapReady]);

  useEffect(() => {
    if (!mapReady || !userCoords) return;
    (async () => {
      const map = mapRef.current;
      if (!map) return;
      const L = (await import('leaflet')).default;
      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng([userCoords.lat, userCoords.lng]);
      } else {
        userMarkerRef.current = L.circleMarker([userCoords.lat, userCoords.lng], {
          radius: 8,
          color: '#fff',
          weight: 2,
          fillColor: '#2563EB',
          fillOpacity: 1,
        })
          .bindTooltip('我', { permanent: false })
          .addTo(map);
      }
    })();
  }, [userCoords, mapReady]);

  const goCampus = () => {
    mapRef.current?.setView([CAMPUS.lat, CAMPUS.lng], CAMPUS.zoom);
  };
  const goUser = () => {
    if (!userCoords || !mapRef.current) return;
    mapRef.current.setView([userCoords.lat, userCoords.lng], 16);
  };

  return (
    <View style={styles.mapWrap}>
      {createElement('div', {
        ref: containerRef,
        style: {
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          borderRadius: 16,
          zIndex: 0,
        },
      })}
      <View style={[styles.mapActions, Platform.OS === 'web' && ({ pointerEvents: 'box-none' } as ViewStyle)]}>
        <Pressable
          onPress={goCampus}
          style={({ pressed }) => [styles.mapBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.mapBtnText}>校園</Text>
        </Pressable>
        <Pressable
          onPress={goUser}
          style={({ pressed }) => [styles.mapBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.mapBtnText}>我</Text>
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
  );
}

export default function MapScreen() {
  const state = useGameState();
  const hydrateError = useHydrateError();
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('all');
  const [mode, setMode] = useState<Mode>('map');
  const [nearest, setNearest] = useState<string | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

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

  const onSelect = useCallback(
    (id: number) => {
      router.push(`/territory/${id}`);
    },
    [router],
  );

  return (
    <Screen style={styles.screen}>
      {hydrateError ? (
        <Card style={{ marginBottom: 10, borderColor: Colors.danger }}>
          <Text style={{ color: Colors.danger, fontWeight: '800' }}>未能同步遊戲資料</Text>
          <Muted>{hydrateError}</Muted>
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
        <View style={styles.modeRow}>
          <Chip label="地圖" selected={mode === 'map'} color={Colors.accent} onPress={() => setMode('map')} />
          <Chip label="列表" selected={mode === 'list'} color={Colors.accent} onPress={() => setMode('list')} />
        </View>
      </View>

      {nearest ? (
        <View style={styles.nearest}>
          <Muted>{nearest}</Muted>
        </View>
      ) : null}

      {mode === 'map' ? (
        <WebCampusMap territories={list} userCoords={userCoords} onSelect={onSelect} />
      ) : (
        <FlatList
          data={list}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ gap: 10, paddingBottom: 24 }}
          style={{ flex: 1 }}
          renderItem={({ item }) => {
            const cooling = item.cooldownUntil && new Date(item.cooldownUntil) > new Date();
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
    minHeight: 420,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bgElevated,
    marginBottom: 8,
    position: 'relative',
    zIndex: 0,
    // Keep Leaflet panes from covering tab bar / other screens
    isolation: 'isolate',
  } as ViewStyle,
  mapActions: {
    position: 'absolute',
    right: 12,
    top: 12,
    gap: 8,
    zIndex: 1000,
  },
  mapBtn: {
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as ViewStyle) : null),
  },
  mapBtnText: { color: Colors.text, fontWeight: '700', fontSize: 13 },
  legend: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    zIndex: 1000,
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
