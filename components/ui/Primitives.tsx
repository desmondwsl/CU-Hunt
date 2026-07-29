import React from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';

type ScreenProps = {
  children: React.ReactNode;
  style?: ViewStyle;
  /**
   * Safe-area edges to inset.
   * Tab screens: top/left/right (tab bar covers bottom).
   * Full screens (login, OEC, territory): include bottom.
   */
  edges?: Edge[];
};

const TAB_EDGES: Edge[] = ['top', 'left', 'right'];
const FULL_EDGES: Edge[] = ['top', 'right', 'bottom', 'left'];

export function Screen({ children, style, edges = TAB_EDGES }: ScreenProps) {
  return (
    <SafeAreaView style={[styles.screen, style]} edges={edges}>
      {children}
    </SafeAreaView>
  );
}

/** Full-screen routes without a bottom tab bar */
export function FullScreen({ children, style }: Omit<ScreenProps, 'edges'>) {
  return (
    <Screen edges={FULL_EDGES} style={style}>
      {children}
    </Screen>
  );
}

export function Title({ children }: { children: React.ReactNode }) {
  return <Text style={styles.title}>{children}</Text>;
}

export function Subtitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.subtitle}>{children}</Text>;
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'danger';
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.btn,
        variant === 'ghost' && styles.btnGhost,
        variant === 'danger' && styles.btnDanger,
        (pressed || disabled) && { opacity: 0.55 },
        Platform.OS === 'web' && ({ cursor: disabled ? 'default' : 'pointer' } as ViewStyle),
      ]}
    >
      <Text
        style={[
          styles.btnText,
          variant === 'ghost' && styles.btnTextGhost,
          variant === 'danger' && styles.btnTextDanger,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  color,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  color?: string;
}) {
  const selectedBg = color ?? Colors.accent;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={[
        styles.chip,
        selected && {
          backgroundColor: selectedBg,
          borderColor: selectedBg,
        },
        Platform.OS === 'web' && ({ cursor: onPress ? 'pointer' : 'default' } as ViewStyle),
      ]}
    >
      <Text
        style={[
          styles.chipText,
          selected && { color: Colors.white, fontWeight: '700' },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  secureTextEntry,
  placeholder,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  secureTextEntry?: boolean;
  placeholder?: string;
  keyboardType?: 'default' | 'number-pad';
}) {
  return (
    <View style={{ gap: 8, marginBottom: 12 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        keyboardType={keyboardType}
        style={styles.input}
        autoCapitalize="none"
      />
    </View>
  );
}

export function Loading() {
  return (
    <SafeAreaView style={[styles.screen, styles.loading]} edges={FULL_EDGES}>
      <ActivityIndicator color={Colors.accent} size="large" />
    </SafeAreaView>
  );
}

export function Muted({ children }: { children: React.ReactNode }) {
  return <Text style={styles.muted}>{children}</Text>;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.bg,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
  },
  loading: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textMuted,
    marginTop: 6,
    lineHeight: 22,
    letterSpacing: -0.1,
  },
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#111827',
        shadowOpacity: 0.04,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
      },
      android: { elevation: 1 },
      default: {},
    }),
  },
  btn: {
    backgroundColor: Colors.accent,
    paddingVertical: 15,
    paddingHorizontal: 18,
    borderRadius: 14,
    alignItems: 'center',
  },
  btnGhost: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
  },
  btnDanger: {
    backgroundColor: Colors.danger,
  },
  btnText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: -0.2,
  },
  btnTextGhost: {
    color: Colors.text,
  },
  btnTextDanger: {
    color: Colors.white,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    backgroundColor: Colors.white,
  },
  chipText: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  label: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: Colors.text,
    fontSize: 16,
  },
  muted: {
    color: Colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
});
