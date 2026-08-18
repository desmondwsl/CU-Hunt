import { useEffect, useState, type CSSProperties } from 'react';
import { Button, Card, Chip, Field, Muted, Screen, Title } from '@/components/ui/Primitives';
import { Colors } from '@/constants/Colors';
import { gameStore } from '@/lib/gameStore';
import { useGameState, useTeamColors } from '@/contexts/GameContext';
import { notifyLocal } from '@/lib/notifications';
import { alert } from '@/lib/alert';
import type { BigTeamCode } from '@/constants/Colors';
import type { GameEvent } from '@/lib/types';

function toTimeInput(label: string) {
  const m = label.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return '';
  return `${m[1].padStart(2, '0')}:${m[2]}`;
}

function EventEditor({ event }: { event: GameEvent }) {
  const original = `${event.timeLabel}|${event.title}|${event.body}|${event.place}`;
  const [timeLabel, setTimeLabel] = useState(toTimeInput(event.timeLabel) || event.timeLabel);
  const [place, setPlace] = useState(event.place);
  const [title, setTitle] = useState(event.title);
  const [body, setBody] = useState(event.body);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTimeLabel(toTimeInput(event.timeLabel) || event.timeLabel);
    setPlace(event.place);
    setTitle(event.title);
    setBody(event.body);
  }, [event.id, event.timeLabel, event.place, event.title, event.body]);

  const dirty = `${timeLabel}|${title}|${body}|${place}` !== original;

  const save = async () => {
    setSaving(true);
    try {
      await gameStore.updateHuntEvent(event.id, {
        timeLabel: (toTimeInput(timeLabel) || timeLabel.trim()) || event.timeLabel,
        title: title.trim() || event.title,
        body,
        place: place.trim(),
      });
    } catch (e) {
      alert('儲存失敗', e instanceof Error ? e.message : '未知錯誤');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <p style={{ margin: 0, color: Colors.text, fontWeight: 700 }}>
        {event.timeLabel} · {event.title}
      </p>
      {event.place ? <Muted>地點：{event.place}</Muted> : null}
      <Muted>{event.body}</Muted>
      <div style={{ marginTop: 12 }}>
        <Field
          label="時間"
          value={toTimeInput(timeLabel) || timeLabel}
          onChangeText={setTimeLabel}
          type={toTimeInput(timeLabel) ? 'time' : 'text'}
        />
        <Field label="地點" value={place} onChangeText={setPlace} placeholder="例如 百萬大道" />
        <Field label="標題" value={title} onChangeText={setTitle} />
        <Field label="內容" value={body} onChangeText={setBody} multiline />
      </div>
      <Button
        label={saving ? '儲存中…' : dirty ? '儲存時間／地點' : '已同步'}
        onPress={save}
        disabled={saving || !dirty}
      />
      <div style={{ height: 8 }} />
      <Button
        label={event.active ? '進行中（再按關閉）' : '啟動並廣播'}
        variant={event.active ? 'ghost' : 'primary'}
        onPress={async () => {
          await gameStore.toggleEvent(event.id, !event.active);
          if (!event.active) {
            const loc = place.trim() ? `（${place.trim()}）` : '';
            await notifyLocal(`突發：${title}`, `${loc} ${body}`.trim());
          }
        }}
      />
    </Card>
  );
}

export default function EventsPage() {
  const state = useGameState();
  const teamColors = useTeamColors();
  const [team, setTeam] = useState<BigTeamCode>('梟');
  const [num, setNum] = useState(1);
  const [bonus, setBonus] = useState('1000');
  const [reason, setReason] = useState('突發事件獎勵');
  const [customTime, setCustomTime] = useState('');
  const [customPlace, setCustomPlace] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [customBody, setCustomBody] = useState('');

  const smallId = `${team}${num}`;

  return (
    <Screen tabs>
      <div className="stack-gap" style={{ gap: 14, paddingBottom: 40 }}>
        <Title>突發事件 / 聖物</Title>
        <Muted>時間同地點可以改；唔改就用原本 15:00／16:00／17:00 同原本地點。</Muted>

        {state.events.map((e) => (
          <EventEditor key={e.id} event={e} />
        ))}

        <Card>
          <p style={hStyle}>新增自訂事件</p>
          <Field label="時間" value={customTime} onChangeText={setCustomTime} type="time" />
          <Field label="地點" value={customPlace} onChangeText={setCustomPlace} placeholder="可留空" />
          <Field label="標題" value={customTitle} onChangeText={setCustomTitle} />
          <Field label="內容" value={customBody} onChangeText={setCustomBody} multiline />
          <Button
            label="加入"
            onPress={async () => {
              if (!customTitle) return alert('請填標題');
              await gameStore.addCustomEvent(
                customTime || 'TBD',
                customTitle,
                customBody,
                customPlace,
              );
              setCustomTime('');
              setCustomPlace('');
              setCustomTitle('');
              setCustomBody('');
            }}
          />
        </Card>

        <Card>
          <p style={hStyle}>授予聖物</p>
          <div className="row" style={{ marginBottom: 10 }}>
            {(['梟', '焽', '赬'] as const).map((b) => (
              <Chip
                key={b}
                label={b}
                selected={team === b}
                color={teamColors[b]}
                onPress={() => setTeam(b)}
              />
            ))}
          </div>
          <div className="row" style={{ marginBottom: 10 }}>
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <Chip key={n} label={`${team}${n}`} selected={num === n} onPress={() => setNum(n)} />
            ))}
          </div>
          <Button
            label={`畀 ${smallId} Engine大粒嘢`}
            onPress={async () => {
              const r = await gameStore.grantRelic(smallId, 'Engine大粒嘢');
              if (!r.ok) alert(r.error);
              else alert('已授予');
            }}
          />
          <div style={{ height: 8 }} />
          <Button
            label={`畀 ${smallId} Jam野`}
            variant="ghost"
            onPress={async () => {
              const r = await gameStore.grantRelic(smallId, 'Jam野');
              if (!r.ok) alert(r.error);
              else alert('已授予');
            }}
          />
        </Card>

        <Card>
          <p style={hStyle}>加減分數</p>
          <Field label="分數（可負數）" value={bonus} onChangeText={setBonus} keyboardType="number-pad" />
          <Field label="原因" value={reason} onChangeText={setReason} />
          <Button
            label={`套用到 ${smallId}`}
            onPress={async () => {
              const delta = Number(bonus);
              if (Number.isNaN(delta)) return alert('分數無效');
              await gameStore.addBonus(smallId, delta, reason || '手動調整');
              alert('已調整');
            }}
          />
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
