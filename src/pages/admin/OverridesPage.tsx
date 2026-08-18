import { useEffect, useState, type CSSProperties } from 'react';
import { Button, Card, Chip, Field, Muted, Screen, Title } from '@/components/ui/Primitives';
import { Colors } from '@/constants/Colors';
import { gameStore } from '@/lib/gameStore';
import { useGameState, useTeamColors } from '@/contexts/GameContext';
import { alert } from '@/lib/alert';
import type { BigTeamCode } from '@/constants/Colors';
import type { Difficulty } from '@/lib/types';

export default function OverridesPage() {
  const state = useGameState();
  const teamColors = useTeamColors();
  const [territoryId, setTerritoryId] = useState(1);
  const [bigTeam, setBigTeam] = useState<BigTeamCode | null>('梟');
  const [num, setNum] = useState(1);
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [teamId, setTeamId] = useState('梟1');
  const [exportText, setExportText] = useState('');

  const [captureCutoff, setCaptureCutoff] = useState(state.settings.captureCutoff);
  const [itemCutoff, setItemCutoff] = useState(state.settings.itemCutoff);
  const [settleTime, setSettleTime] = useState(state.settings.settleTime);

  useEffect(() => {
    setCaptureCutoff(state.settings.captureCutoff);
    setItemCutoff(state.settings.itemCutoff);
    setSettleTime(state.settings.settleTime);
  }, [state.settings.captureCutoff, state.settings.itemCutoff, state.settings.settleTime]);

  useEffect(() => {
    const t = setTimeout(() => {
      const patch: Partial<{
        captureCutoff: string;
        itemCutoff: string;
        settleTime: string;
      }> = {};
      if (/^\d{1,2}:\d{2}$/.test(captureCutoff) && captureCutoff !== state.settings.captureCutoff) {
        patch.captureCutoff = captureCutoff;
      }
      if (/^\d{1,2}:\d{2}$/.test(itemCutoff) && itemCutoff !== state.settings.itemCutoff) {
        patch.itemCutoff = itemCutoff;
      }
      if (/^\d{1,2}:\d{2}$/.test(settleTime) && settleTime !== state.settings.settleTime) {
        patch.settleTime = settleTime;
      }
      if (Object.keys(patch).length) {
        void gameStore.updateSettings(patch);
      }
    }, 600);
    return () => clearTimeout(t);
  }, [captureCutoff, itemCutoff, settleTime, state.settings]);

  const terr = state.territories.find((t) => t.id === territoryId)!;

  const applyOwner = async () => {
    if (!bigTeam) {
      await gameStore.overrideTerritory(territoryId, {
        ownerBigTeam: null,
        ownerSmallTeamId: null,
        difficulty: null,
        capturedAt: null,
        cooldownUntil: null,
      });
      alert('已清空陣地');
      return;
    }
    const smallTeamId = `${bigTeam}${num}`;
    const now = new Date();
    await gameStore.overrideTerritory(territoryId, {
      ownerBigTeam: bigTeam,
      ownerSmallTeamId: smallTeamId,
      difficulty,
      capturedAt: now.toISOString(),
      cooldownUntil: new Date(now.getTime() + 15 * 60000).toISOString(),
    });
    alert('已覆寫佔領');
  };

  const exportCsv = () => {
    const captureLines = [
      'at,territory,team,difficulty,draw,message',
      ...state.captures.map(
        (c) =>
          `${c.at},${c.territoryName},${c.smallTeamId},${c.difficulty},${c.drawResult ?? ''},"${c.message.replace(/"/g, "'")}"`,
      ),
    ];
    const itemLines = [
      'at,actor,delta,item,target,bounced,message',
      ...state.itemEvents.map(
        (e) =>
          `${e.at},${e.actorSmallTeamId},${e.delta},${e.itemId},${e.targetSmallTeamId ?? ''},${e.bounced ?? false},"${e.message.replace(/"/g, "'")}"`,
      ),
    ];
    setExportText([...captureLines, '', ...itemLines].join('\n'));
    alert('已產生 CSV', '向下捲動複製內容');
  };

  return (
    <Screen tabs>
      <div className="stack-gap" style={{ gap: 14, paddingBottom: 40 }}>
        <Title>手動覆寫</Title>

        <Card>
          <p style={hStyle}>陣地擁有者</p>
          <div className="row" style={{ marginBottom: 10 }}>
            {state.territories.map((t) => (
              <Chip
                key={t.id}
                label={`${t.id}`}
                selected={territoryId === t.id}
                onPress={() => setTerritoryId(t.id)}
              />
            ))}
          </div>
          <Muted>
            目前：{terr.name} · {terr.ownerSmallTeamId ?? '空置'}
          </Muted>
          <div className="row" style={{ marginBottom: 10 }}>
            <Chip label="清空" selected={bigTeam === null} onPress={() => setBigTeam(null)} />
            {(['梟', '焽', '赬'] as const).map((b) => (
              <Chip
                key={b}
                label={b}
                selected={bigTeam === b}
                color={teamColors[b]}
                onPress={() => setBigTeam(b)}
              />
            ))}
          </div>
          {bigTeam && (
            <>
              <div className="row" style={{ marginBottom: 10 }}>
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <Chip key={n} label={`${bigTeam}${n}`} selected={num === n} onPress={() => setNum(n)} />
                ))}
              </div>
              <div className="row" style={{ marginBottom: 10 }}>
                <Chip label="簡單" selected={difficulty === 'easy'} onPress={() => setDifficulty('easy')} />
                <Chip label="困難" selected={difficulty === 'hard'} onPress={() => setDifficulty('hard')} />
              </div>
            </>
          )}
          <Button label="套用佔領覆寫" onPress={applyOwner} />
          <div style={{ height: 8 }} />
          <Button
            label="清除冷卻"
            variant="ghost"
            onPress={async () => {
              await gameStore.overrideTerritory(territoryId, { cooldownUntil: null });
              alert('已清除冷卻');
            }}
          />
          <div style={{ height: 8 }} />
          <Button
            label={terr.closed ? '重新開放陣地' : '關閉陣地（雨程）'}
            variant="ghost"
            onPress={async () => {
              await gameStore.overrideTerritory(territoryId, { closed: !terr.closed });
            }}
          />
        </Card>

        <Card>
          <p style={hStyle}>細組旗標</p>
          <Field label="細組 ID" value={teamId} onChangeText={setTeamId} placeholder="赬3" />
          <Button
            label="標記遲交 HuntBook（−35%）"
            variant="danger"
            onPress={async () => {
              await gameStore.setTeamFlags(teamId, { late: true });
              alert('已標記遲交');
            }}
          />
          <div style={{ height: 8 }} />
          <Button
            label="取消遲交"
            variant="ghost"
            onPress={async () => {
              await gameStore.setTeamFlags(teamId, { late: false });
            }}
          />
        </Card>

        <Card>
          <p style={hStyle}>時間設定</p>
          <Muted>輸入 HH:mm 後約 0.6 秒自動儲存</Muted>
          <Field label="攻佔截止 HH:mm" value={captureCutoff} onChangeText={setCaptureCutoff} />
          <Field label="錦囊截止 HH:mm" value={itemCutoff} onChangeText={setItemCutoff} />
          <Field label="結算 HH:mm" value={settleTime} onChangeText={setSettleTime} />
        </Card>

        <Card>
          <p style={hStyle}>匯出紀錄</p>
          <Button label="產生 Captures + Items CSV" onPress={exportCsv} />
          {!!exportText && (
            <pre
              style={{
                color: Colors.textMuted,
                marginTop: 10,
                fontSize: 11,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                userSelect: 'text',
              }}
            >
              {exportText}
            </pre>
          )}
        </Card>
      </div>
    </Screen>
  );
}

const hStyle: CSSProperties = {
  color: Colors.text,
  fontWeight: 800,
  margin: '0 0 10px',
  fontSize: 15,
};
