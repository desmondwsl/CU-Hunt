import { Stack } from 'expo-router';
import { Colors } from '@/constants/Colors';

export default function OecLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.bg },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'OEC 站崗' }} />
    </Stack>
  );
}
