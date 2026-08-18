import { useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useGameState, useScores, useTeamColors } from '@/contexts/GameContext';
import { Colors } from '@/constants/Colors';
import { ITEMS, type ItemId } from '@/constants/items';
import { MIN_TASKS } from '@/constants/huntbook';
import { Button, Card, Chip, Muted, Screen, Title } from '@/components/ui/Primitives';
import { gameStore } from '@/lib/gameStore';
import { BIG_TEAMS } from '@/constants/territories';
import { alert } from '@/lib/alert';

export default function TeamPage() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const state = useGameState();
  const teamColors = useTeamColors();
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
      <Screen tabs>
        <Title>未選擇細組</Title>
      </Screen>
    );
  }

  const onItemAction = async () => {
    if (!isEc) {
      alert('需要跟組 EC', '只有跟組 EC 可以登錄／使用錦囊。');
      return;
    }
    if (mode === 'obtain') {
      const r = await gameStore.obtain(team.id, itemId);
      if (!r.ok) alert('失敗', r.error);
      else alert('成功', `獲得「${ITEMS[itemId].name}」`);
      return;
    }
    const target = `${targetBig}${targetNum}`;
    const r = await gameStore.use(team.id, itemId, target);
    if (!r.ok) alert('失敗', r.error);
    else {
      const msg =
        'message' in r && r.message
          ? r.message
          : 'state' in r && r.state.itemEvents[0]?.message
            ? r.state.itemEvents[0].message
            : '';
      alert(r.bounced ? '被反彈！' : '已使用', msg);
    }
  };

  const onLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <Screen tabs>
      <div className="stack-gap" style={{ gap: 14, paddingBottom: 40 }}>
        <div>
          <Title>{team.id}</Title>
          <p style={{ margin: 0, color: teamColors[team.bigTeam], fontWeight: 800, fontSize: 16 }}>
            {BIG_TEAMS.find((b) => b.code === team.bigTeam)?.fullName}
          </p>
          <Muted>
            分數 {score?.score ?? 0} · Task {team.taskIds.length}/{MIN_TASKS}
            {team.hasJamYe ? ' · 持有 Jam野' : ''}
          </Muted>
          {isEc ? <Muted>EC 只能為本細組登錄／使用錦囊</Muted> : null}
        </div>

        <Card>
          <p style={hStyle}>已完成陣地</p>
          <Muted>{team.taskIds.length ? team.taskIds.map((id) => `#${id}`).join('  ') : '尚未完成'}</Muted>
        </Card>

        <Card>
          <p style={hStyle}>錦囊庫存</p>
          {(Object.keys(ITEMS) as unknown as ItemId[]).map((id) => (
            <div key={id} style={{ display: 'flex', padding: '6px 0', gap: 8 }}>
              <span style={{ color: Colors.text, flex: 1 }}>
                {id}. {ITEMS[id].name}
              </span>
              <span style={{ color: Colors.accent, fontWeight: 800 }}>×{team.items[id]}</span>
            </div>
          ))}
        </Card>

        {isEc && (
          <Card>
            <p style={hStyle}>錦囊操作（EC）</p>
            <div className="row" style={{ marginBottom: 10 }}>
              <Chip label="使用" selected={mode === 'use'} onPress={() => setMode('use')} />
              <Chip label="獲得" selected={mode === 'obtain'} onPress={() => setMode('obtain')} />
            </div>
            <div className="row" style={{ marginBottom: 10 }}>
              {(Object.keys(ITEMS) as unknown as ItemId[]).map((id) => (
                <Chip
                  key={id}
                  label={`${id}`}
                  selected={itemId === id}
                  onPress={() => setItemId(id)}
                />
              ))}
            </div>
            <Muted>{ITEMS[itemId].description}</Muted>
            {mode === 'use' && (
              <>
                <p style={{ ...hStyle, marginTop: 10 }}>目標細組</p>
                <div className="row" style={{ marginBottom: 10 }}>
                  {(['梟', '焽', '赬'] as const).map((b) => (
                    <Chip
                      key={b}
                      label={b}
                      selected={targetBig === b}
                      color={teamColors[b]}
                      onPress={() => setTargetBig(b)}
                    />
                  ))}
                </div>
                <div className="row" style={{ marginBottom: 10 }}>
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <Chip
                      key={n}
                      label={`${targetBig}${n}`}
                      selected={targetNum === n}
                      onPress={() => setTargetNum(n)}
                    />
                  ))}
                </div>
              </>
            )}
            <Button label={mode === 'obtain' ? '登記獲得' : '發動錦囊'} onPress={onItemAction} />
          </Card>
        )}

        <Button label="登出" variant="ghost" onPress={onLogout} />
      </div>
    </Screen>
  );
}

const hStyle: CSSProperties = {
  color: Colors.text,
  fontWeight: 800,
  margin: '0 0 8px',
  fontSize: 15,
};
