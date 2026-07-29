import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/contexts/GameContext';
import { Colors } from '@/constants/Colors';
import { Loading } from '@/components/ui/Primitives';
import { ensureNotificationPermission } from '@/lib/notifications';
import { patchAlertForWeb } from '@/lib/alert';

patchAlertForWeb();

function RootNavigator() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    ensureNotificationPermission().catch(() => {});
  }, []);

  useEffect(() => {
    if (loading) return;
    const root = segments[0];
    const inAuth = root === 'login';
    if (!session && !inAuth) {
      router.replace('/login');
      return;
    }
    if (!session) return;

    if (root === 'territory' || root === 'login') return;

    if (session.role === 'admin' && root !== '(admin)') {
      router.replace('/(admin)');
    } else if (session.role === 'oec' && root !== '(oec)') {
      router.replace('/(oec)');
    } else if (
      (session.role === 'player' || session.role === 'ec') &&
      root !== '(player)'
    ) {
      router.replace('/(player)/map');
    }
  }, [session, loading, segments, router]);

  if (loading) return <Loading />;

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.bg },
        }}
      >
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(player)" options={{ headerShown: false }} />
        <Stack.Screen name="(oec)" options={{ headerShown: false }} />
        <Stack.Screen name="(admin)" options={{ headerShown: false }} />
        <Stack.Screen name="territory/[id]" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
