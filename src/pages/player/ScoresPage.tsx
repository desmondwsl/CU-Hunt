import type { CSSProperties } from 'react';
import { useAuth, useGameState, useScores, useTeamColors } from '@/contexts/GameContext';
import { Colors } from '@/constants/Colors';
import { Card, Muted, Screen, Title } from '@/components/ui/Primitives';
import { LINKAGES, CURSES } from '@/constants/territories';

export default function ScoresPage() {
  const { session } = useAuth();
  const { bigScores, smallScores } = useScores();
  const state = useGameState();
  const teamColors = useTeamColors();
  const myTeamId = session?.smallTeamId;
  const myBig = session?.bigTeam;

  return (
    <Screen tabs>
      <div className="stack-gap" style={{ gap: 14, paddingBottom: 40 }}>
        <Title>實時分數</Title>
        <Muted>
          結算 {state.settings.settleTime}
          {state.settings.scoreFrozen ? ' · 已凍結' : ' · 每分鐘累計中'}
        </Muted>

        {bigScores.map((b, i) => {
          const mine = myBig === b.code;
          return (
            <Card
              key={b.code}
              style={{
                borderLeftWidth: 5,
                borderLeftStyle: 'solid',
                borderLeftColor: teamColors[b.code],
                ...(mine ? { borderColor: teamColors[b.code], borderWidth: 1.5 } : null),
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ color: Colors.textMuted, fontWeight: 800, width: 28 }}>#{i + 1}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, color: Colors.text, fontWeight: 800, fontSize: 17 }}>
                    {b.code} {b.fullName}
                    {mine ? ' · 我哋' : ''}
                  </p>
                  <Muted>
                    陣地 {b.heldCount} · 連結 +{b.linkageBonus} · 詛咒 {b.cursePenalty}
                  </Muted>
                </div>
                <span style={{ fontWeight: 900, fontSize: 22, color: teamColors[b.code] }}>{b.total}</span>
              </div>
            </Card>
          );
        })}

        <p style={sectionStyle}>細組排行</p>
        {[...smallScores]
          .sort((a, b) => b.score - a.score)
          .slice(0, 18)
          .map((s, i) => {
            const mine = myTeamId === s.id;
            return (
              <Card
                key={s.id}
                style={
                  mine
                    ? { borderColor: teamColors[s.bigTeam], borderWidth: 1.5 }
                    : undefined
                }
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ color: Colors.textMuted, fontWeight: 800, width: 28 }}>#{i + 1}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, color: Colors.text, fontWeight: mine ? 800 : 700 }}>
                      {s.id}
                      {mine ? ' · 我哋' : ''}
                    </p>
                    <Muted>
                      簡單 {s.easyMin}m · 困難 {s.hardMin}m · Task {s.taskIds.length}/12
                      {s.late ? ' · 遲交' : ''}
                    </Muted>
                  </div>
                  <span style={{ color: teamColors[s.bigTeam], fontWeight: 800, fontSize: 18 }}>
                    {s.score}
                  </span>
                </div>
              </Card>
            );
          })}

        <p style={sectionStyle}>連結／詛咒進度</p>
        {Object.values(LINKAGES).map((l) => {
          const held = myBig
            ? l.territoryIds.filter(
                (id) => state.territories.find((t) => t.id === id)?.ownerBigTeam === myBig,
              ).length
            : null;
          const awarded = state.linkageAwards.filter(
            (a) => a.linkageId === l.id && (!myBig || a.bigTeam === myBig),
          );
          return (
            <Card key={l.id}>
              <p style={{ margin: 0, color: Colors.text, fontWeight: 700 }}>{l.id}</p>
              <Muted>
                T2 {l.tier2Count || '—'} → +{l.tier2Bonus} · T1 全佔 → +{l.tier1Bonus}
              </Muted>
              <Muted>陣地：{l.territoryIds.join(', ')}</Muted>
              {held != null && (
                <Muted>
                  我哋大組已佔 {held}/{l.territoryIds.length}
                  {awarded.length
                    ? ` · 已獎勵 ${awarded.map((a) => `T${a.tier}`).join('/')}`
                    : ' · 尚未達標'}
                </Muted>
              )}
            </Card>
          );
        })}
        {Object.values(CURSES).map((c) => {
          const active = state.activeCurses.find(
            (a) => a.curseId === c.id && (!myBig || a.bigTeam === myBig),
          );
          const held = myBig
            ? c.territoryIds.filter(
                (id) => state.territories.find((t) => t.id === id)?.ownerBigTeam === myBig,
              ).length
            : null;
          return (
            <Card key={c.id}>
              <p style={{ margin: 0, color: Colors.danger, fontWeight: 700 }}>詛咒 · {c.id}</p>
              <Muted>
                {c.description} · {c.penalty} · 陣地 {c.territoryIds.join(', ')}
              </Muted>
              {held != null && (
                <Muted>
                  我哋大組已佔 {held}/{c.territoryIds.length}
                  {active ? ` · 生效中 ${active.points}` : ''}
                </Muted>
              )}
            </Card>
          );
        })}
      </div>
    </Screen>
  );
}

const sectionStyle: CSSProperties = {
  color: Colors.text,
  fontWeight: 700,
  marginTop: 10,
  marginBottom: 2,
  fontSize: 18,
  letterSpacing: -0.3,
};
