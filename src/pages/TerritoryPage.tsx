import type { CSSProperties } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGameState, useTeamColors } from '@/contexts/GameContext';
import { Colors } from '@/constants/Colors';
import { POINTS_PER_MIN } from '@/constants/territories';
import { Card, Muted, FullScreen, Title } from '@/components/ui/Primitives';

export default function TerritoryPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const state = useGameState();
  const teamColors = useTeamColors();
  const t = state.territories.find((x) => x.id === Number(id));

  if (!t) {
    return (
      <FullScreen>
        <button type="button" onClick={() => navigate(-1)} style={backStyle}>
          ← 返回
        </button>
        <Title>找不到陣地</Title>
      </FullScreen>
    );
  }

  const cooling = t.cooldownUntil && new Date(t.cooldownUntil) > new Date();
  const color = t.ownerBigTeam ? teamColors[t.ownerBigTeam] : teamColors.empty;

  return (
    <FullScreen>
      <div className="stack-gap" style={{ gap: 12, paddingBottom: 40 }}>
        <button type="button" onClick={() => navigate(-1)} style={backStyle}>
          ← 返回
        </button>
        {!!t.imageUrl && (
          <img
            src={t.imageUrl}
            alt={t.name}
            style={{
              width: '100%',
              height: 180,
              objectFit: 'cover',
              borderRadius: 14,
              backgroundColor: Colors.bgCard,
            }}
          />
        )}
        <Title>
          {t.id}. {t.name}
        </Title>
        <p style={{ margin: 0, color, fontWeight: 800, fontSize: 16 }}>
          {t.ownerBigTeam
            ? `屬於 ${t.ownerSmallTeamId}（${t.difficulty === 'hard' ? '困難' : '簡單'}）`
            : '空置'}
        </p>
        <Muted>
          {cooling
            ? `冷卻至 ${new Date(t.cooldownUntil!).toLocaleTimeString()}`
            : '現在可以挑戰'}
          {t.closed ? ' · 已關閉' : ''}
        </Muted>

        <Card>
          <p style={hStyle}>考驗 · {t.taskName}</p>
          <p style={liStyle}>
            簡單（{POINTS_PER_MIN.easy}/分）：{t.easyRule}
          </p>
          <p style={liStyle}>
            困難（{POINTS_PER_MIN.hard}/分）：{t.hardRule}
          </p>
        </Card>

        <Card>
          <p style={hStyle}>連結</p>
          <p style={liStyle}>{t.linkage}</p>
          {t.curse ? (
            <p style={{ ...liStyle, color: Colors.danger }}>詛咒：{t.curse}</p>
          ) : null}
        </Card>

        <Card>
          <p style={hStyle}>雨程</p>
          <p style={liStyle}>{t.rainVenue}</p>
        </Card>

        <Card>
          <p style={hStyle}>位置</p>
          <Muted>
            {t.lat.toFixed(5)}, {t.lng.toFixed(5)}
          </Muted>
        </Card>
      </div>
    </FullScreen>
  );
}

const backStyle: CSSProperties = {
  color: Colors.textMuted,
  fontWeight: 600,
  marginBottom: 8,
  fontSize: 15,
  background: 'none',
  border: 'none',
  padding: 0,
  cursor: 'pointer',
  textAlign: 'left',
};

const hStyle: CSSProperties = {
  color: Colors.text,
  fontWeight: 800,
  margin: '0 0 8px',
};

const liStyle: CSSProperties = {
  color: Colors.textMuted,
  lineHeight: '22px',
  margin: '0 0 4px',
};
