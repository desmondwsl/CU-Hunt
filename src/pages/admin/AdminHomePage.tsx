import { useEffect, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useGameState, useScores, useTeamColors } from '@/contexts/GameContext';
import { Colors, TeamColors } from '@/constants/Colors';
import { Button, Card, Field, Muted, Screen, Title, DemoModeBanner } from '@/components/ui/Primitives';
import { gameStore } from '@/lib/gameStore';
import { alert } from '@/lib/alert';
import type { BigTeamCode } from '@/constants/Colors';

function isHHMM(v: string) {
  return /^\d{1,2}:\d{2}$/.test(v);
}

function isDate(v: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(v);
}

function TeamColorCard() {
  const state = useGameState();
  const [draft, setDraft] = useState<Record<BigTeamCode, string>>({
    梟: state.bigTeams.find((b) => b.code === '梟')?.color ?? TeamColors.梟,
    焽: state.bigTeams.find((b) => b.code === '焽')?.color ?? TeamColors.焽,
    赬: state.bigTeams.find((b) => b.code === '赬')?.color ?? TeamColors.赬,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft({
      梟: state.bigTeams.find((b) => b.code === '梟')?.color ?? TeamColors.梟,
      焽: state.bigTeams.find((b) => b.code === '焽')?.color ?? TeamColors.焽,
      赬: state.bigTeams.find((b) => b.code === '赬')?.color ?? TeamColors.赬,
    });
  }, [state.bigTeams]);

  const dirty = (['梟', '焽', '赬'] as const).some((code) => {
    const live = state.bigTeams.find((b) => b.code === code)?.color ?? TeamColors[code];
    return draft[code].toLowerCase() !== live.toLowerCase();
  });

  const save = async () => {
    setSaving(true);
    try {
      if (!gameStore.usingRemote) {
        alert(
          '未連接 Supabase',
          '呢個網站係 Demo 模式，顏色只會留喺呢部手機／電腦，唔會寫入資料庫。請喺 Vercel 設定環境變數後 Redeploy。',
        );
      }
      for (const code of ['梟', '焽', '赬'] as const) {
        const live = state.bigTeams.find((b) => b.code === code)?.color ?? TeamColors[code];
        if (draft[code].toLowerCase() !== live.toLowerCase()) {
          await gameStore.updateBigTeamColor(code, draft[code]);
        }
      }
    } catch (e) {
      alert('儲存失敗', e instanceof Error ? e.message : '未知錯誤');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <p style={setupTitleStyle}>大組顏色</p>
      <Muted>預設係原本 梟藍／焽紅／赬綠。只改你想改嗰組，其他唔使郁。</Muted>
      {(['梟', '焽', '赬'] as const).map((code) => {
        const name = state.bigTeams.find((b) => b.code === code)?.fullName ?? code;
        return (
          <div
            key={code}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginTop: 10,
            }}
          >
            <span style={{ fontWeight: 800, minWidth: 72, color: draft[code] }}>
              {code} {name}
            </span>
            <input
              type="color"
              value={/^#[0-9A-Fa-f]{6}$/.test(draft[code]) ? draft[code] : TeamColors[code]}
              onChange={(e) => setDraft((d) => ({ ...d, [code]: e.target.value }))}
              style={{ width: 48, height: 36, border: 'none', background: 'none', padding: 0 }}
            />
            <input
              value={draft[code]}
              onChange={(e) => setDraft((d) => ({ ...d, [code]: e.target.value }))}
              style={{
                flex: 1,
                border: `1px solid ${Colors.borderStrong}`,
                borderRadius: 12,
                padding: '10px 12px',
                fontSize: 15,
              }}
            />
            <button
              type="button"
              onClick={() => setDraft((d) => ({ ...d, [code]: TeamColors[code] }))}
              style={{
                border: 'none',
                background: 'none',
                color: Colors.textMuted,
                fontSize: 12,
                fontWeight: 700,
                padding: 4,
              }}
            >
              還原
            </button>
          </div>
        );
      })}
      <div style={{ height: 12 }} />
      <Button
        label={saving ? '儲存中…' : dirty ? '儲存大組顏色' : '顏色已同步'}
        onPress={save}
        disabled={saving || !dirty}
      />
    </Card>
  );
}

export default function AdminHomePage() {
  const { logout, usingRemote } = useAuth();
  const navigate = useNavigate();
  const state = useGameState();
  const { bigScores } = useScores();
  const teamColors = useTeamColors();

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

  const onLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const saveSetup = async () => {
    if (!isDate(huntDate)) {
      alert('日期格式錯誤', '請用 YYYY-MM-DD，例如 2026-08-20');
      return;
    }
    if (![captureCutoff, itemCutoff, settleTime].every(isHHMM)) {
      alert('時間格式錯誤', '請用 HH:mm，例如 18:25');
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
      alert('已儲存開Camp設定');
    } catch (e) {
      alert('儲存失敗', e instanceof Error ? e.message : '未知錯誤');
    } finally {
      setSaving(false);
    }
  };

  const startGame = () => {
    alert('開始遊戲？', '會解除暫停，各站可以開始登記攻佔。', [
      { text: '取消', style: 'cancel' },
      {
        text: '開始',
        onPress: async () => {
          try {
            if (dirty) {
              if (!isDate(huntDate) || ![captureCutoff, itemCutoff, settleTime].every(isHHMM)) {
                alert('請先修正時間格式再開始');
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
            alert('遊戲已開始');
          } catch (e) {
            alert('失敗', e instanceof Error ? e.message : '未知錯誤');
          }
        },
      },
    ]);
  };

  const resetGame = () => {
    alert(
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
              alert('已重置', '遊戲已暫停，請檢查時間後再按「開始遊戲」。');
            } catch (e) {
              alert('重置失敗', e instanceof Error ? e.message : '未知錯誤');
            }
          },
        },
      ],
    );
  };

  return (
    <Screen tabs>
      <div className="stack-gap" style={{ gap: 12, paddingBottom: 40 }}>
        <Title>OC Dashboard</Title>
        {!usingRemote ? <DemoModeBanner /> : null}
        <Muted>
          {state.settings.paused ? '已暫停' : '進行中'} ·{' '}
          {state.settings.scoreFrozen ? '分數已凍結' : '分數累計中'} · 更新{' '}
          {new Date(state.updatedAt).toLocaleTimeString()}
        </Muted>

        <Card style={{ borderColor: Colors.accent, borderWidth: 1 }}>
          <p style={setupTitleStyle}>開Camp設定</p>
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
          <div style={{ height: 8 }} />
          <Button
            label={state.settings.paused ? '開始遊戲' : '遊戲進行中（再按可暫停）'}
            onPress={() => {
              if (state.settings.paused) startGame();
              else void gameStore.setPaused(true);
            }}
            variant={state.settings.paused ? 'primary' : 'danger'}
          />
          <div style={{ height: 8 }} />
          <Button
            label={state.settings.scoreFrozen ? '解除凍結分數' : '凍結分數'}
            variant="ghost"
            onPress={() => gameStore.setScoreFrozen(!state.settings.scoreFrozen)}
          />
          <div style={{ height: 8 }} />
          <Button label="重置全部遊戲資料" variant="danger" onPress={resetGame} />
        </Card>

        <TeamColorCard />

        <Card>
          <p style={setupTitleStyle}>突發事件清單</p>
          <Muted>時間標籤只係提示；到點請去「事件」頁按啟動並廣播。地點／時間可喺事件頁改，唔改就用原本。</Muted>
          {state.events.length === 0 ? (
            <Muted>尚未有事件（可喺事件頁新增）</Muted>
          ) : (
            state.events.map((e) => (
              <div
                key={e.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: '10px 0',
                  borderTop: `1px solid ${Colors.border}`,
                }}
              >
                <div style={{ flex: 1 }}>
                  <p style={{ margin: '0 0 2px', color: Colors.text, fontWeight: 700 }}>
                    {e.timeLabel} · {e.title}
                    {e.place ? ` · ${e.place}` : ''}
                  </p>
                  <Muted>{e.body}</Muted>
                </div>
                <span
                  style={{
                    color: e.active ? Colors.success : Colors.textMuted,
                    fontWeight: 800,
                    fontSize: 12,
                  }}
                >
                  {e.active ? '進行中' : '待命'}
                </span>
              </div>
            ))
          )}
        </Card>

        <p style={sectionStyle}>大組分數</p>
        {bigScores.map((b) => (
          <Card
            key={b.code}
            style={{
              borderLeftWidth: 4,
              borderLeftStyle: 'solid',
              borderLeftColor: teamColors[b.code],
            }}
          >
            <p style={{ margin: 0, color: Colors.text, fontWeight: 800, fontSize: 17 }}>
              {b.code} {b.fullName}
            </p>
            <p style={{ margin: 0, color: teamColors[b.code], fontWeight: 900, fontSize: 24 }}>{b.total}</p>
            <Muted>
              佔領 {b.heldCount} · 連結 +{b.linkageBonus} · 詛咒 {b.cursePenalty} · 事件 {b.eventPoints}
            </Muted>
          </Card>
        ))}

        <p style={sectionStyle}>25 陣地狀態</p>
        {state.territories.map((t) => (
          <Card key={t.id}>
            <p style={{ margin: 0, color: Colors.text, fontWeight: 700 }}>
              {t.id}. {t.name}{' '}
              <span style={{ color: t.ownerBigTeam ? teamColors[t.ownerBigTeam] : Colors.textMuted }}>
                {t.ownerSmallTeamId ?? '空置'}
              </span>
            </p>
            <Muted>
              {t.difficulty ?? '—'}
              {t.cooldownUntil ? ` · CD ${new Date(t.cooldownUntil).toLocaleTimeString()}` : ''}
              {t.closed ? ' · 關閉' : ''}
            </Muted>
          </Card>
        ))}

        <p style={sectionStyle}>最近攻佔</p>
        {state.captures.slice(0, 15).map((c) => (
          <Card key={c.id}>
            <Muted>{new Date(c.at).toLocaleTimeString()}</Muted>
            <p style={{ margin: 0, color: Colors.text }}>{c.message}</p>
          </Card>
        ))}

        <Button label="登出" variant="ghost" onPress={onLogout} />
      </div>
    </Screen>
  );
}

const setupTitleStyle: CSSProperties = {
  color: Colors.text,
  fontWeight: 800,
  fontSize: 16,
  margin: '0 0 8px',
};

const sectionStyle: CSSProperties = {
  color: Colors.text,
  fontWeight: 700,
  marginTop: 10,
  marginBottom: 0,
  fontSize: 18,
  letterSpacing: -0.3,
};
