import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameState, useHydrateError, useTeamColors } from '@/contexts/GameContext';
import { Colors } from '@/constants/Colors';
import { Card, Chip, Muted, Screen } from '@/components/ui/Primitives';
import { distanceMeters, getCurrentCoords } from '@/lib/location';
import type { TerritoryState } from '@/lib/types';

type Filter = 'all' | 'empty' | '梟' | '焽' | '赬';
type Mode = 'map' | 'list';

const CAMPUS = { lat: 22.4198, lng: 114.2068, zoom: 15 };

function pinColor(
  t: TerritoryState,
  colors: Record<'梟' | '焽' | '赬' | 'empty', string>,
): string {
  if (t.closed) return Colors.borderStrong;
  if (t.ownerBigTeam) return colors[t.ownerBigTeam];
  return colors.empty;
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
  const teamColors = useTeamColors();

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
      if (!document.getElementById('cuhunt-leaflet-pin-css')) {
        const style = document.createElement('style');
        style.id = 'cuhunt-leaflet-pin-css';
        style.textContent =
          '.cuhunt-pin{background:transparent!important;border:none!important}';
        document.head.appendChild(style);
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
        const color = pinColor(t, teamColors);
        const icon = L.divIcon({
          className: 'cuhunt-pin',
          html: `<div style="
            min-width:32px;height:32px;padding:0 7px;box-sizing:border-box;
            border-radius:16px;background:${color};border:2px solid #fff;
            color:#fff;font:800 13px/28px system-ui,sans-serif;
            text-align:center;display:flex;align-items:center;justify-content:center;
            box-shadow:0 1px 4px rgba(0,0,0,.35);cursor:pointer;
          ">${t.id}</div>`,
          iconSize: [36, 32],
          iconAnchor: [18, 16],
        });
        const marker = L.marker([t.lat, t.lng], { icon });
        marker.bindTooltip(`${t.id}. ${t.name}`, { direction: 'top', offset: [0, -14] });
        marker.on('click', () => onSelectRef.current(t.id));
        marker.addTo(group);
      }
    })();
  }, [territories, mapReady, teamColors]);

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
    <div
      style={{
        flex: 1,
        minHeight: 420,
        borderRadius: 16,
        overflow: 'hidden',
        border: `1px solid ${Colors.border}`,
        backgroundColor: Colors.bgElevated,
        marginBottom: 8,
        position: 'relative',
        zIndex: 0,
        isolation: 'isolate',
      }}
    >
      <div
        ref={containerRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          borderRadius: 16,
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: 'absolute',
          right: 12,
          top: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          zIndex: 1000,
          pointerEvents: 'none',
        }}
      >
        <button type="button" onClick={goCampus} style={mapBtnStyle}>
          校園
        </button>
        <button type="button" onClick={goUser} style={mapBtnStyle}>
          我
        </button>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 12,
          bottom: 12,
          zIndex: 1000,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
          backgroundColor: 'rgba(255,255,255,0.92)',
          borderRadius: 12,
          padding: '8px 10px',
          border: `1px solid ${Colors.border}`,
        }}
      >
        {(['梟', '焽', '赬'] as const).map((team) => (
          <div key={team} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: teamColors[team],
              }}
            />
            <span style={{ color: Colors.textMuted, fontSize: 11, fontWeight: 600 }}>{team}</span>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: teamColors.empty,
            }}
          />
          <span style={{ color: Colors.textMuted, fontSize: 11, fontWeight: 600 }}>空置</span>
        </div>
      </div>
    </div>
  );
}

const mapBtnStyle: CSSProperties = {
  padding: '0 12px',
  height: 36,
  borderRadius: 10,
  backgroundColor: Colors.bgElevated,
  border: `1px solid ${Colors.border}`,
  color: Colors.text,
  fontWeight: 700,
  fontSize: 13,
  cursor: 'pointer',
  pointerEvents: 'auto',
};

export default function MapPage() {
  const state = useGameState();
  const hydrateError = useHydrateError();
  const teamColors = useTeamColors();
  const navigate = useNavigate();
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
      navigate(`/territory/${id}`);
    },
    [navigate],
  );

  return (
    <Screen tabs>
      {hydrateError ? (
        <Card style={{ marginBottom: 10, borderColor: Colors.danger }}>
          <p style={{ margin: 0, color: Colors.danger, fontWeight: 800 }}>未能同步遊戲資料</p>
          <Muted>{hydrateError}</Muted>
        </Card>
      ) : null}
      {state.settings.paused && (
        <Card style={{ marginBottom: 10, borderColor: Colors.danger }}>
          <p style={{ margin: 0, color: Colors.danger, fontWeight: 800 }}>遊戲已暫停</p>
          <Muted>請等待 OC 指示。</Muted>
        </Card>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 4 }}>
        <div className="row">
          {(['all', 'empty', '梟', '焽', '赬'] as const).map((f) => (
            <Chip
              key={f}
              label={f === 'all' ? '全部' : f === 'empty' ? '空置' : f}
              selected={filter === f}
              color={f === '梟' || f === '焽' || f === '赬' ? teamColors[f] : Colors.accent}
              onPress={() => setFilter(f)}
            />
          ))}
        </div>
        <div className="row">
          <Chip label="地圖" selected={mode === 'map'} color={Colors.accent} onPress={() => setMode('map')} />
          <Chip label="列表" selected={mode === 'list'} color={Colors.accent} onPress={() => setMode('list')} />
        </div>
      </div>

      {nearest ? (
        <div style={{ marginBottom: 8, marginTop: 4 }}>
          <Muted>{nearest}</Muted>
        </div>
      ) : null}

      {mode === 'map' ? (
        <WebCampusMap territories={list} userCoords={userCoords} onSelect={onSelect} />
      ) : (
        <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 24 }}>
          {list.map((item) => {
            const cooling = item.cooldownUntil && new Date(item.cooldownUntil) > new Date();
            const color = pinColor(item, teamColors);
            return (
              <Card
                key={item.id}
                onClick={() => navigate(`/territory/${item.id}`)}
                style={{ borderLeftWidth: 4, borderLeftStyle: 'solid', borderLeftColor: color }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ margin: 0, color: Colors.text, fontWeight: 800, fontSize: 16 }}>
                    {item.id}. {item.name}
                  </p>
                  <p style={{ margin: 0, fontWeight: 800, fontSize: 14, color }}>
                    {item.ownerBigTeam ? `${item.ownerSmallTeamId}` : '空置'}
                  </p>
                </div>
                <p style={{ margin: '6px 0 0', color: Colors.accentSoft, fontWeight: 600, fontSize: 13 }}>
                  {item.taskName}
                </p>
                <Muted>
                  {item.linkage}
                  {cooling
                    ? ` · 冷卻至 ${new Date(item.cooldownUntil!).toLocaleTimeString()}`
                    : ' · 可攻佔'}
                  {item.closed ? ' · 已關閉' : ''}
                </Muted>
              </Card>
            );
          })}
        </div>
      )}
    </Screen>
  );
}
