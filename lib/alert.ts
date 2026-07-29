import { Alert, Platform } from 'react-native';

type AlertButton = {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

/**
 * React Native Web's Alert.alert is weak (multi-button dialogs often do nothing).
 * Patch once at app start so existing Alert.alert(...) calls work in the browser.
 */
export function patchAlertForWeb() {
  if (Platform.OS !== 'web') return;
  if (typeof window === 'undefined') return;

  Alert.alert = ((
    title?: string,
    message?: string,
    buttons?: AlertButton[],
  ) => {
    const text = [title, message].filter(Boolean).join('\n\n');
    const btns = buttons?.length ? buttons : [{ text: 'OK' }];

    if (btns.length === 1) {
      window.alert(text || '');
      btns[0]?.onPress?.();
      return;
    }

    const cancel = btns.find((b) => b.style === 'cancel');
    const confirm =
      [...btns].reverse().find((b) => b.style !== 'cancel') ?? btns[btns.length - 1];

    const ok = window.confirm(text || title || '確認？');
    if (ok) confirm?.onPress?.();
    else cancel?.onPress?.();
  }) as typeof Alert.alert;
}
