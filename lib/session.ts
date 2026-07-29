import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { Session } from './types';

const SESSION_KEY = 'cuhunt.session';
const PIN_KEY = 'cuhunt.session.pin';

/** Web: keep PIN in sessionStorage so shared PCs don't persist it across browser restarts. */
function webPinGet(): string | null {
  if (typeof sessionStorage === 'undefined') return null;
  return sessionStorage.getItem(PIN_KEY);
}

function webPinSet(pin: string) {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(PIN_KEY, pin);
  // Clear any older AsyncStorage copy of the PIN
  void AsyncStorage.removeItem(PIN_KEY);
}

function webPinClear() {
  if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(PIN_KEY);
  void AsyncStorage.removeItem(PIN_KEY);
}

async function setPinSecure(pin: string) {
  if (Platform.OS === 'web') {
    webPinSet(pin);
    return;
  }
  await SecureStore.setItemAsync(PIN_KEY, pin);
}

async function getPinSecure(): Promise<string | null> {
  if (Platform.OS === 'web') {
    const fromSession = webPinGet();
    if (fromSession) return fromSession;
    // One-time migrate from older AsyncStorage PIN
    const legacy = await AsyncStorage.getItem(PIN_KEY);
    if (legacy) {
      webPinSet(legacy);
      return legacy;
    }
    return null;
  }
  return SecureStore.getItemAsync(PIN_KEY);
}

async function clearPinSecure() {
  if (Platform.OS === 'web') {
    webPinClear();
    return;
  }
  await SecureStore.deleteItemAsync(PIN_KEY);
}

export async function loadSession(): Promise<Session | null> {
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw) as Session;
    let pin = await getPinSecure();
    if (!pin && session.pin) {
      pin = session.pin;
      await setPinSecure(pin);
    }
    if (!pin) return { ...session, pin: undefined };
    const { pin: _drop, ...rest } = session;
    return { ...rest, pin };
  } catch {
    return null;
  }
}

export async function saveSession(session: Session): Promise<void> {
  const pin = session.pin;
  if (pin) await setPinSecure(pin);
  const { pin: _drop, ...rest } = session;
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(rest));
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_KEY);
  await clearPinSecure();
}
