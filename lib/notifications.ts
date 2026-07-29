import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

async function ensureWebNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return ensureWebNotificationPermission();
  }
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function notifyLocal(title: string, body: string) {
  if (Platform.OS === 'web') {
    const ok = await ensureWebNotificationPermission();
    if (!ok) return;
    try {
      new Notification(title, { body, silent: false });
    } catch {
      // Ignore — browser may block without user gesture
    }
    return;
  }

  const ok = await ensureNotificationPermission();
  if (!ok) return;
  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true },
    trigger: null,
  });
}

export async function getPushToken(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  try {
    const ok = await ensureNotificationPermission();
    if (!ok) return null;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('cuhunt', {
        name: 'CU Hunt',
        importance: Notifications.AndroidImportance.MAX,
      });
    }
    const token = await Notifications.getExpoPushTokenAsync();
    return token.data;
  } catch {
    return null;
  }
}
