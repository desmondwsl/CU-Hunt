import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Colors } from '@/constants/Colors';
import { ITEMS, type ItemId } from '@/constants/items';
import { Button } from '@/components/ui/Primitives';

const REEL: { id: ItemId | 0; label: string; color: string }[] = [
  { id: 0, label: '抽唔到', color: '#6B7280' },
  { id: 1, label: '錦囊 #1\nBeat', color: '#1E3A5F' },
  { id: 2, label: '錦囊 #2\n消暑', color: '#0F6B4C' },
  { id: 3, label: '錦囊 #3\n工程', color: '#B42318' },
  { id: 4, label: '錦囊 #4\n影相', color: '#9A7B4F' },
  { id: 5, label: '錦囊 #5\n67', color: '#2563EB' },
  { id: 6, label: '錦囊 #6\n反彈', color: '#7C3AED' },
];

const CELL = 88;

function indexForDraw(draw: ItemId | 0): number {
  return REEL.findIndex((s) => s.id === draw);
}

function resultTitle(draw: ItemId | 0): string {
  if (draw === 0) return '抽唔到…';
  return `獲得「${ITEMS[draw].name}」`;
}

function resultBody(draw: ItemId | 0): string {
  if (draw === 0) return '恭喜你抽唔到。下次攻佔再試！';
  return ITEMS[draw].description;
}

/** Repeat reel so we can scroll many loops then land on the result. */
function buildStrip() {
  const loops = 8;
  const out: typeof REEL = [];
  for (let i = 0; i < loops; i++) out.push(...REEL);
  return out;
}

type Props = {
  visible: boolean;
  draw: ItemId | 0;
  territoryName?: string;
  teamId?: string;
  onDone: () => void;
};

export function LuckyDrawModal({ visible, draw, territoryName, teamId, onDone }: Props) {
  const strip = buildStrip();
  const translateY = useSharedValue(0);
  const [phase, setPhase] = useState<'ready' | 'spinning' | 'done'>('ready');

  useEffect(() => {
    if (!visible) {
      setPhase('ready');
      translateY.value = 0;
    }
  }, [visible, translateY]);

  const spin = () => {
    if (phase !== 'ready') return;
    setPhase('spinning');
    const idx = indexForDraw(draw);
    // Land so chosen cell is centered in the 3-cell window (middle = offset CELL)
    const loops = 5;
    const targetIndex = loops * REEL.length + idx;
    const targetY = -(targetIndex * CELL - CELL);

    translateY.value = 0;
    translateY.value = withTiming(
      targetY,
      { duration: 3800, easing: Easing.bezier(0.15, 0.85, 0.2, 1) },
      (finished) => {
        if (finished) runOnJS(setPhase)('done');
      },
    );
  };

  const reelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDone}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.kicker}>錦囊幸運輪</Text>
          <Text style={styles.sub}>
            {teamId ? `${teamId} · ` : ''}
            {territoryName ? `攻佔「${territoryName}」成功` : '攻佔成功'}
          </Text>

          <View style={styles.window}>
            <View style={styles.windowMask} pointerEvents="none" />
            <Animated.View style={reelStyle}>
              {strip.map((item, i) => (
                <View
                  key={`${item.id}-${i}`}
                  style={[styles.cell, { backgroundColor: item.color, height: CELL }]}
                >
                  <Text style={styles.cellText}>{item.label}</Text>
                </View>
              ))}
            </Animated.View>
            <View style={styles.selector} pointerEvents="none" />
          </View>

          {phase === 'ready' && (
            <View style={{ width: '100%', marginTop: 16 }}>
              <Button label="撳下去抽！" onPress={spin} />
              <Text style={styles.hint}>由 OEC 站崗抽錦囊 · 結果已入系統</Text>
            </View>
          )}

          {phase === 'spinning' && <Text style={styles.waiting}>轉緊… 睇中邊張！</Text>}

          {phase === 'done' && (
            <View style={styles.result}>
              <Text style={[styles.resultTitle, draw === 0 && { color: Colors.textMuted }]}>
                {resultTitle(draw)}
              </Text>
              <Text style={styles.resultBody}>{resultBody(draw)}</Text>
              <Button label="收到！" onPress={onDone} />
            </View>
          )}

          {phase !== 'done' && (
            <Pressable onPress={onDone} style={styles.skip} accessibilityRole="button">
              <Text style={styles.skipText}>稍後睇結果</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(17,24,39,0.58)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  kicker: {
    color: Colors.text,
    fontWeight: '800',
    fontSize: 22,
    letterSpacing: -0.4,
  },
  sub: {
    color: Colors.textMuted,
    marginTop: 6,
    marginBottom: 16,
    fontSize: 13,
    textAlign: 'center',
  },
  window: {
    width: 220,
    height: CELL * 3,
    overflow: 'hidden',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.borderStrong,
    backgroundColor: Colors.bg,
  },
  windowMask: {
    ...StyleSheet.absoluteFill,
    zIndex: 2,
    borderRadius: 14,
    borderWidth: 0,
  },
  selector: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: CELL,
    height: CELL,
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: Colors.text,
    zIndex: 3,
  },
  cell: {
    width: 220,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  cellText: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 20,
  },
  hint: {
    color: Colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 10,
  },
  waiting: { color: Colors.textMuted, marginTop: 18, fontWeight: '700' },
  result: { width: '100%', marginTop: 16, gap: 10 },
  resultTitle: {
    color: Colors.success,
    fontWeight: '900',
    fontSize: 20,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  resultBody: {
    color: Colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 4,
  },
  skip: { marginTop: 14, padding: 8 },
  skipText: { color: Colors.textMuted, fontSize: 13 },
});
