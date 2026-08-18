import { useEffect, useState } from 'react';
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
  const [translateY, setTranslateY] = useState(0);
  const [transition, setTransition] = useState('none');
  const [phase, setPhase] = useState<'ready' | 'spinning' | 'done'>('ready');

  useEffect(() => {
    if (!visible) {
      setPhase('ready');
      setTransition('none');
      setTranslateY(0);
    }
  }, [visible]);

  useEffect(() => {
    if (phase !== 'spinning') return;
    const t = window.setTimeout(() => setPhase('done'), 3800);
    return () => window.clearTimeout(t);
  }, [phase]);

  if (!visible) return null;

  const spin = () => {
    if (phase !== 'ready') return;
    setPhase('spinning');
    const idx = indexForDraw(draw);
    const loops = 5;
    const targetIndex = loops * REEL.length + idx;
    const targetY = -(targetIndex * CELL - CELL);

    setTransition('none');
    setTranslateY(0);
    // Force reflow so the transition starts from 0
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTransition('transform 3800ms cubic-bezier(0.15, 0.85, 0.2, 1)');
        setTranslateY(targetY);
      });
    });
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(17,24,39,0.58)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        style={{
          width: '100%',
          maxWidth: 400,
          background: Colors.white,
          borderRadius: 20,
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          border: `1px solid ${Colors.border}`,
        }}
      >
        <p
          style={{
            margin: 0,
            color: Colors.text,
            fontWeight: 800,
            fontSize: 22,
            letterSpacing: -0.4,
          }}
        >
          錦囊幸運輪
        </p>
        <p
          style={{
            margin: '6px 0 16px',
            color: Colors.textMuted,
            fontSize: 13,
            textAlign: 'center',
          }}
        >
          {teamId ? `${teamId} · ` : ''}
          {territoryName ? `攻佔「${territoryName}」成功` : '攻佔成功'}
        </p>

        <div
          style={{
            width: 220,
            height: CELL * 3,
            overflow: 'hidden',
            borderRadius: 16,
            border: `2px solid ${Colors.borderStrong}`,
            background: Colors.bg,
            position: 'relative',
          }}
        >
          <div
            style={{
              transform: `translateY(${translateY}px)`,
              transition,
            }}
          >
            {strip.map((item, i) => (
              <div
                key={`${item.id}-${i}`}
                style={{
                  width: 220,
                  height: CELL,
                  backgroundColor: item.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 8px',
                  boxSizing: 'border-box',
                }}
              >
                <span
                  style={{
                    color: Colors.white,
                    fontWeight: 800,
                    fontSize: 16,
                    textAlign: 'center',
                    lineHeight: '20px',
                    whiteSpace: 'pre-line',
                  }}
                >
                  {item.label}
                </span>
              </div>
            ))}
          </div>
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: CELL,
              height: CELL,
              borderTop: `2px solid ${Colors.text}`,
              borderBottom: `2px solid ${Colors.text}`,
              zIndex: 3,
              pointerEvents: 'none',
            }}
          />
        </div>

        {phase === 'ready' && (
          <div style={{ width: '100%', marginTop: 16 }}>
            <Button label="撳下去抽！" onPress={spin} />
            <p
              style={{
                color: Colors.textMuted,
                fontSize: 11,
                textAlign: 'center',
                marginTop: 10,
                marginBottom: 0,
              }}
            >
              由 OEC 站崗抽錦囊 · 結果已入系統
            </p>
          </div>
        )}

        {phase === 'spinning' && (
          <p style={{ color: Colors.textMuted, marginTop: 18, fontWeight: 700 }}>
            轉緊… 睇中邊張！
          </p>
        )}

        {phase === 'done' && (
          <div style={{ width: '100%', marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p
              style={{
                margin: 0,
                color: draw === 0 ? Colors.textMuted : Colors.success,
                fontWeight: 900,
                fontSize: 20,
                textAlign: 'center',
                letterSpacing: -0.4,
              }}
            >
              {resultTitle(draw)}
            </p>
            <p
              style={{
                margin: '0 0 4px',
                color: Colors.textMuted,
                fontSize: 13,
                lineHeight: '20px',
                textAlign: 'center',
              }}
            >
              {resultBody(draw)}
            </p>
            <Button label="收到！" onPress={onDone} />
          </div>
        )}

        {phase !== 'done' && (
          <button
            type="button"
            onClick={onDone}
            style={{
              marginTop: 14,
              padding: 8,
              background: 'none',
              border: 'none',
              color: Colors.textMuted,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            稍後睇結果
          </button>
        )}
      </div>
    </div>
  );
}
