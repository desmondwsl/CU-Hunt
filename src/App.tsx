import { useEffect } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/GameContext';
import { Loading } from '@/components/ui/Primitives';
import { ensureNotificationPermission } from '@/lib/notifications';
import { PlayerLayout } from '@/layouts/PlayerLayout';
import { AdminLayout } from '@/layouts/AdminLayout';
import LoginPage from '@/pages/LoginPage';
import MapPage from '@/pages/player/MapPage';
import ScoresPage from '@/pages/player/ScoresPage';
import TeamPage from '@/pages/player/TeamPage';
import FeedPage from '@/pages/player/FeedPage';
import BookPage from '@/pages/player/BookPage';
import TerritoryPage from '@/pages/TerritoryPage';
import OecPage from '@/pages/oec/OecPage';
import AdminHomePage from '@/pages/admin/AdminHomePage';
import BroadcastPage from '@/pages/admin/BroadcastPage';
import EventsPage from '@/pages/admin/EventsPage';
import OverridesPage from '@/pages/admin/OverridesPage';

function homeForRole(role: string) {
  if (role === 'admin') return '/admin';
  if (role === 'oec') return '/oec';
  return '/player/map';
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Loading />;
  if (!session) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}

function RoleGate({
  allow,
  children,
}: {
  allow: Array<'player' | 'ec' | 'oec' | 'admin'>;
  children: React.ReactNode;
}) {
  const { session } = useAuth();
  if (!session) return null;
  if (!allow.includes(session.role)) {
    return <Navigate to={homeForRole(session.role)} replace />;
  }
  return children;
}

function RootRedirect() {
  const { session, loading } = useAuth();
  if (loading) return <Loading />;
  if (!session) return <Navigate to="/login" replace />;
  return <Navigate to={homeForRole(session.role)} replace />;
}

function AppRoutes() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    ensureNotificationPermission().catch(() => {});
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!session) {
      if (location.pathname !== '/login') navigate('/login', { replace: true });
      return;
    }
    if (location.pathname === '/login' || location.pathname.startsWith('/territory')) return;
    const home = homeForRole(session.role);
    const ok =
      (session.role === 'admin' && location.pathname.startsWith('/admin')) ||
      (session.role === 'oec' && location.pathname.startsWith('/oec')) ||
      ((session.role === 'player' || session.role === 'ec') &&
        location.pathname.startsWith('/player'));
    if (!ok) navigate(home, { replace: true });
  }, [session, loading, location.pathname, navigate]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/player"
        element={
          <RequireAuth>
            <RoleGate allow={['player', 'ec']}>
              <PlayerLayout />
            </RoleGate>
          </RequireAuth>
        }
      >
        <Route path="map" element={<MapPage />} />
        <Route path="scores" element={<ScoresPage />} />
        <Route path="team" element={<TeamPage />} />
        <Route path="feed" element={<FeedPage />} />
        <Route path="book" element={<BookPage />} />
        <Route index element={<Navigate to="map" replace />} />
      </Route>
      <Route
        path="/admin"
        element={
          <RequireAuth>
            <RoleGate allow={['admin']}>
              <AdminLayout />
            </RoleGate>
          </RequireAuth>
        }
      >
        <Route index element={<AdminHomePage />} />
        <Route path="broadcast" element={<BroadcastPage />} />
        <Route path="events" element={<EventsPage />} />
        <Route path="overrides" element={<OverridesPage />} />
      </Route>
      <Route
        path="/oec"
        element={
          <RequireAuth>
            <RoleGate allow={['oec']}>
              <Outlet />
            </RoleGate>
          </RequireAuth>
        }
      >
        <Route index element={<OecPage />} />
      </Route>
      <Route
        path="/territory/:id"
        element={
          <RequireAuth>
            <TerritoryPage />
          </RequireAuth>
        }
      />
      <Route path="/" element={<RootRedirect />} />
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <div className="app-shell">
        <AppRoutes />
      </div>
    </AuthProvider>
  );
}
