import React, { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { TeamColors, type BigTeamCode } from '@/constants/Colors';
import { clearSession, loadSession, saveSession } from '@/lib/session';
import { gameStore, loginWithPin } from '@/lib/gameStore';
import { isSupabaseConfigured } from '@/lib/supabase';
import type { GameState, Session } from '@/lib/types';

type LoginParams = Parameters<typeof loginWithPin>[0];
type LoginResult = Awaited<ReturnType<typeof loginWithPin>>;

type AuthContextValue = {
  session: Session | null;
  loading: boolean;
  usingRemote: boolean;
  login: (params: LoginParams) => Promise<LoginResult>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      await gameStore.init();
      const s = await loadSession();
      gameStore.setSession(s);
      setSession(s);
      setLoading(false);
    })();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      loading,
      usingRemote: isSupabaseConfigured,
      login: async (params) => {
        const result = await loginWithPin(params);
        if (result.ok) {
          await saveSession(result.session);
          gameStore.setSession(result.session);
          setSession(result.session);
          if (isSupabaseConfigured) await gameStore.refreshFromRemote();
        }
        return result;
      },
      logout: async () => {
        await clearSession();
        gameStore.setSession(null);
        setSession(null);
      },
    }),
    [session, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth outside provider');
  return ctx;
}

export function useGameState(): GameState {
  return useSyncExternalStore(
    (cb) => gameStore.subscribe(cb),
    () => gameStore.getState(),
    () => gameStore.getState(),
  );
}

export function useScores() {
  const state = useGameState();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, []);
  return useMemo(() => gameStore.scores(), [state, tick]);
}

export function useHydrateError(): string | null {
  return useSyncExternalStore(
    (cb) => gameStore.subscribe(cb),
    () => gameStore.getHydrateError(),
    () => gameStore.getHydrateError(),
  );
}

export function useTeamColors(): Record<BigTeamCode | 'empty', string> {
  const state = useGameState();
  const fromState = Object.fromEntries((state.bigTeams ?? []).map((b) => [b.code, b.color])) as Partial<
    Record<BigTeamCode, string>
  >;
  return {
    梟: fromState.梟 ?? TeamColors.梟,
    焽: fromState.焽 ?? TeamColors.焽,
    赬: fromState.赬 ?? TeamColors.赬,
    empty: TeamColors.empty,
  };
}
