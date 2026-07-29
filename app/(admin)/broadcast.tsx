import { useState } from 'react';
import { Alert, ScrollView } from 'react-native';
import { Button, Card, Field, Muted, Screen, Title } from '@/components/ui/Primitives';
import { gameStore } from '@/lib/gameStore';
import { notifyLocal } from '@/lib/notifications';
import { useGameState } from '@/contexts/GameContext';

export default function BroadcastScreen() {
  const state = useGameState();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const send = async () => {
    if (!title.trim() || !body.trim()) {
      Alert.alert('請填寫標題同內容');
      return;
    }
    await gameStore.broadcast(title.trim(), body.trim());
    await notifyLocal(title.trim(), body.trim());
    setTitle('');
    setBody('');
    Alert.alert('已廣播');
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ gap: 14, paddingBottom: 40 }}>
        <Title>世界廣播</Title>
        <Muted>會出現喺所有人嘅廣播頁，並嘗試推送本機通知。</Muted>
        <Card>
          <Field label="標題" value={title} onChangeText={setTitle} placeholder="例如：突發！去百萬大道" />
          <Field label="內容" value={body} onChangeText={setBody} placeholder="詳細指示…" />
          <Button label="發送廣播" onPress={send} />
        </Card>
        {state.announcements
          .filter((a) => a.kind === 'broadcast')
          .slice(0, 10)
          .map((a) => (
            <Card key={a.id}>
              <Muted>{new Date(a.at).toLocaleTimeString()}</Muted>
              <Title>{a.title}</Title>
              <Muted>{a.body}</Muted>
            </Card>
          ))}
      </ScrollView>
    </Screen>
  );
}
