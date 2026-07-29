import { Redirect } from 'expo-router';
import { useAuth } from '@/contexts/GameContext';
import { Loading } from '@/components/ui/Primitives';

export default function Index() {
  const { session, loading } = useAuth();
  if (loading) return <Loading />;
  if (!session) return <Redirect href="/login" />;
  if (session.role === 'admin') return <Redirect href="/(admin)" />;
  if (session.role === 'oec') return <Redirect href="/(oec)" />;
  return <Redirect href="/(player)/map" />;
}
