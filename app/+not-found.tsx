import { Link, Stack } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { Colors } from '@/constants/Colors';
import { FullScreen } from '@/components/ui/Primitives';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <FullScreen style={styles.container}>
        <Text style={styles.title}>This screen does not exist.</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Go home</Text>
        </Link>
      </FullScreen>
    </>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '800', color: Colors.text },
  link: { marginTop: 16, padding: 12 },
  linkText: { color: Colors.accent, fontWeight: '700' },
});
