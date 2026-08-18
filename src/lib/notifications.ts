async function ensureWebNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export async function ensureNotificationPermission(): Promise<boolean> {
  return ensureWebNotificationPermission();
}

export async function notifyLocal(title: string, body: string) {
  const ok = await ensureWebNotificationPermission();
  if (!ok) return;
  try {
    new Notification(title, { body, silent: false });
  } catch {
    // Ignore — browser may block without user gesture
  }
}
