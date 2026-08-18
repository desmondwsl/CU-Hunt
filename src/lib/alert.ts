type AlertButton = {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

/** Browser-friendly alert/confirm matching the old RN Alert.alert API. */
export function alert(
  title?: string,
  message?: string,
  buttons?: AlertButton[],
) {
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
}
