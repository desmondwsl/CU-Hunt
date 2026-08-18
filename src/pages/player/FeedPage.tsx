import { format } from 'date-fns';
import { useGameState } from '@/contexts/GameContext';
import { Colors } from '@/constants/Colors';
import { Card, Muted, Screen, Title } from '@/components/ui/Primitives';

export default function FeedPage() {
  const state = useGameState();

  return (
    <Screen tabs>
      <Title>世界廣播</Title>
      <Muted>突發事件同陣地動態</Muted>
      <div
        style={{
          marginTop: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          paddingBottom: 40,
        }}
      >
        {state.announcements.map((item) => (
          <Card
            key={item.id}
            style={{
              borderLeftWidth: 3,
              borderLeftStyle: 'solid',
              borderLeftColor:
                item.kind === 'event'
                  ? Colors.hard
                  : item.kind === 'broadcast'
                    ? Colors.accentWarm
                    : Colors.borderStrong,
            }}
          >
            <p style={{ margin: 0, color: Colors.textMuted, fontSize: 12 }}>
              {format(new Date(item.at), 'HH:mm:ss')} · {item.kind}
            </p>
            <p style={{ margin: '4px 0 0', color: Colors.text, fontWeight: 800 }}>{item.title}</p>
            <p style={{ margin: '4px 0 0', color: Colors.textMuted, lineHeight: '20px' }}>{item.body}</p>
          </Card>
        ))}
      </div>
    </Screen>
  );
}
