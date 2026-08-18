import { useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useGameState, useTeamColors } from '@/contexts/GameContext';
import { Colors } from '@/constants/Colors';
import { BIG_TEAMS } from '@/constants/territories';
import { Button, Card, Chip, Muted, FullScreen, Title } from '@/components/ui/Primitives';
import { LuckyDrawModal } from '@/components/LuckyDrawWheel';
import { gameStore } from '@/lib/gameStore';
import { alert } from '@/lib/alert';
import type { Difficulty } from '@/lib/types';
import type { BigTeamCode } from '@/constants/Colors';
import type { ItemId } from '@/constants/items';

export default function OecPage() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const state = useGameState();
  const teamColors = useTeamColors();
  const territory = state.territories.find((t) => t.id === session?.territoryId);

  const [bigTeam, setBigTeam] = useState<BigTeamCode>('梟');
  const [num, setNum] = useState(1);
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [busy, setBusy] = useState(false);
  const [drawShow, setDrawShow] = useState<{
    draw: ItemId | 0;
    teamId: string;
  } | null>(null);

  const onLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  if (!territory) {
    return (
      <FullScreen>
        <Title>未設定陣地</Title>
        <Button label="登出" onPress={onLogout} />
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
      alert('無法攻佔', result.error);
      return;
    }
    const draw = (result.draw ?? 0) as ItemId | 0;
    setDrawShow({ draw, teamId: smallTeamId });
  };

  const color = territory.ownerBigTeam ? teamColors[territory.ownerBigTeam] : teamColors.empty;
  const feed = state.announcements.slice(0, 6);

  return (
    <FullScreen>
      <LuckyDrawModal
        visible={!!drawShow}
        draw={drawShow?.draw ?? 0}
        territoryName={territory.name}
        teamId={drawShow?.teamId}
        onDone={() => setDrawShow(null)}
      />
      <div className="stack-gap" style={{ gap: 14, paddingBottom: 40 }}>
        <div>
          <Muted>{session?.displayName}</Muted>
          <Title>
            {territory.id}. {territory.name}
          </Title>
          <p style={{ margin: 0, color, fontWeight: 800 }}>
            {territory.ownerBigTeam
              ? `目前：${territory.ownerSmallTeamId}`
              : '目前：空置'}
          </p>
          <Muted>
            考驗：{territory.taskName}
            {territory.cooldownUntil && new Date(territory.cooldownUntil) > new Date()
              ? ` · 冷卻至 ${new Date(territory.cooldownUntil).toLocaleTimeString()}`
              : ''}
          </Muted>
          <Muted>此帳號只能為本陣地登記攻佔</Muted>
        </div>

        {feed.length > 0 && (
          <Card>
            <p style={hStyle}>最新廣播 / 系統</p>
            {feed.map((a) => (
              <div key={a.id} style={{ marginBottom: 10 }}>
                <p style={{ margin: 0, color: Colors.text, fontWeight: 700, fontSize: 13 }}>{a.title}</p>
                <Muted>{a.body}</Muted>
              </div>
            ))}
          </Card>
        )}

        <Card>
          <p style={hStyle}>簡單 / 困難達標</p>
          <p style={liStyle}>簡單：{territory.easyRule}</p>
          <p style={liStyle}>困難：{territory.hardRule}</p>
          <Muted>雨程：{territory.rainVenue}</Muted>
        </Card>

        <Card>
          <p style={hStyle}>攻佔細組</p>
          <div className="row" style={{ marginBottom: 10 }}>
            {BIG_TEAMS.map((b) => (
              <Chip
                key={b.code}
                label={b.code}
                selected={bigTeam === b.code}
                color={teamColors[b.code]}
                onPress={() => setBigTeam(b.code)}
              />
            ))}
          </div>
          <div className="row" style={{ marginBottom: 10 }}>
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <Chip
                key={n}
                label={`${bigTeam}${n}`}
                selected={num === n}
                onPress={() => setNum(n)}
              />
            ))}
          </div>
          <div className="row" style={{ marginBottom: 10 }}>
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
          </div>
          <Button label={busy ? '處理中…' : '確認攻佔'} onPress={submit} disabled={busy} />
        </Card>

        <Button label="登出" variant="ghost" onPress={onLogout} />
      </div>
    </FullScreen>
  );
}

const hStyle: CSSProperties = {
  color: Colors.text,
  fontWeight: 800,
  margin: '0 0 10px',
  fontSize: 15,
};

const liStyle: CSSProperties = {
  color: Colors.text,
  margin: '0 0 6px',
  lineHeight: '20px',
};
