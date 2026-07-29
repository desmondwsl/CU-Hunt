import { FlatList, Text } from 'react-native';
import { format } from 'date-fns';
import { useGameState } from '@/contexts/GameContext';
import { Colors } from '@/constants/Colors';
import { Card, Muted, Screen, Title } from '@/components/ui/Primitives';

export default function FeedScreen() {
  const state = useGameState();

  return (
    <Screen>
      <Title>世界廣播</Title>
      <Muted>突發事件同陣地動態</Muted>
      <FlatList
        style={{ marginTop: 12 }}
        data={state.announcements}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 10, paddingBottom: 40 }}
        renderItem={({ item }) => (
          <Card
            style={{
              borderLeftWidth: 3,
              borderLeftColor:
                item.kind === 'event'
                  ? Colors.hard
                  : item.kind === 'broadcast'
                    ? Colors.accentWarm
                    : Colors.borderStrong,
            }}
          >
            <Text style={{ color: Colors.textMuted, fontSize: 12 }}>
              {format(new Date(item.at), 'HH:mm:ss')} · {item.kind}
            </Text>
            <Text style={{ color: Colors.text, fontWeight: '800', marginTop: 4 }}>{item.title}</Text>
            <Text style={{ color: Colors.textMuted, marginTop: 4, lineHeight: 20 }}>{item.body}</Text>
          </Card>
        )}
      />
    </Screen>
  );
}
