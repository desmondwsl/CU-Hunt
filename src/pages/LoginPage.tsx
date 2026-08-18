import { useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useTeamColors } from '@/contexts/GameContext';
import { Colors, type BigTeamCode } from '@/constants/Colors';
import { BIG_TEAMS, TERRITORIES } from '@/constants/territories';
import { Button, Chip, Field, FullScreen, Subtitle, Title, Muted, Card } from '@/components/ui/Primitives';
import { alert } from '@/lib/alert';
import type { Role } from '@/lib/types';

const ROLES: { id: Role; label: string }[] = [
  { id: 'player', label: '細組 / Freshmen' },
  { id: 'ec', label: '跟組 EC' },
  { id: 'oec', label: 'OEC（站崗）' },
  { id: 'admin', label: 'OC Admin' },
];

export default function LoginPage() {
  const { login, usingRemote } = useAuth();
  const teamColors = useTeamColors();
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>('player');
  const [pin, setPin] = useState('');
  const [bigTeam, setBigTeam] = useState<BigTeamCode>('梟');
  const [smallNum, setSmallNum] = useState(1);
  const [territoryId, setTerritoryId] = useState(1);
  const [busy, setBusy] = useState(false);

  const onSubmit = async () => {
    setBusy(true);
    const result = await login({
      role,
      pin,
      bigTeam,
      smallTeamNum: smallNum,
      territoryId,
    });
    setBusy(false);
    if (!result.ok) {
      alert('登入失敗', result.error);
      return;
    }
    if (role === 'admin') navigate('/admin', { replace: true });
    else if (role === 'oec') navigate('/oec', { replace: true });
    else navigate('/player/map', { replace: true });
  };

  return (
    <FullScreen>
      <div className="stack-gap" style={{ gap: 18, paddingBottom: 40 }}>
        <div>
          <p
            style={{
              color: Colors.accentWarm,
              fontWeight: 700,
              letterSpacing: 3.5,
              fontSize: 12,
              margin: '0 0 10px',
              textTransform: 'uppercase',
            }}
          >
            CU HUNT
          </p>
          <Title>中大尋獵</Title>
          <Subtitle>Orientation camp · 陣地 · 錦囊 · 實時分數</Subtitle>
          <Muted>
            {usingRemote ? '已連接 Supabase（多人即時同步）' : '本機 Demo 模式（未設定 Supabase）'}
          </Muted>
        </div>

        <Card>
          <p style={sectionStyle}>身份</p>
          <div className="row" style={{ marginBottom: 8 }}>
            {ROLES.map((r) => (
              <Chip
                key={r.id}
                label={r.label}
                selected={role === r.id}
                onPress={() => setRole(r.id)}
              />
            ))}
          </div>
        </Card>

        {(role === 'player' || role === 'ec') && (
          <Card>
            <p style={sectionStyle}>大組</p>
            <div className="row" style={{ marginBottom: 8 }}>
              {BIG_TEAMS.map((bt) => (
                <Chip
                  key={bt.code}
                  label={`${bt.code} ${bt.fullName}`}
                  selected={bigTeam === bt.code}
                  color={teamColors[bt.code]}
                  onPress={() => setBigTeam(bt.code)}
                />
              ))}
            </div>
            <p style={{ ...sectionStyle, marginTop: 12 }}>細組</p>
            <div className="row" style={{ marginBottom: 8 }}>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <Chip
                  key={n}
                  label={`${bigTeam}${n}`}
                  selected={smallNum === n}
                  color={teamColors[bigTeam]}
                  onPress={() => setSmallNum(n)}
                />
              ))}
            </div>
          </Card>
        )}

        {role === 'oec' && (
          <Card>
            <p style={sectionStyle}>負責陣地</p>
            <div className="row" style={{ marginBottom: 8 }}>
              {TERRITORIES.map((t) => (
                <Chip
                  key={t.id}
                  label={`${t.id} ${t.name}`}
                  selected={territoryId === t.id}
                  onPress={() => setTerritoryId(t.id)}
                />
              ))}
            </div>
          </Card>
        )}

        <Field
          label="PIN"
          value={pin}
          onChangeText={setPin}
          secureTextEntry
          keyboardType="number-pad"
          placeholder="輸入 PIN"
        />

        <Button label={busy ? '登入中…' : '進入 Hunt'} onPress={onSubmit} disabled={busy || !pin} />
      </div>
    </FullScreen>
  );
}

const sectionStyle: CSSProperties = {
  color: Colors.text,
  fontWeight: 700,
  margin: '0 0 12px',
  fontSize: 14,
  letterSpacing: -0.2,
};
