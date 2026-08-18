import type { Session } from './types';

const SESSION_KEY = 'cuhunt.session';
const PIN_KEY = 'cuhunt.session.pin';

function pinGet(): string | null {
  return sessionStorage.getItem(PIN_KEY);
}

function pinSet(pin: string) {
  sessionStorage.setItem(PIN_KEY, pin);
}

function pinClear() {
  sessionStorage.removeItem(PIN_KEY);
}

export async function loadSession(): Promise<Session | null> {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw) as Session;
    let pin = pinGet();
    if (!pin && session.pin) {
      pin = session.pin;
      pinSet(pin);
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
  if (pin) pinSet(pin);
  const { pin: _drop, ...rest } = session;
  localStorage.setItem(SESSION_KEY, JSON.stringify(rest));
}

export async function clearSession(): Promise<void> {
  localStorage.removeItem(SESSION_KEY);
  pinClear();
}
