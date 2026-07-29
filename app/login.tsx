import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/GameContext';
import { Colors, TeamColors, type BigTeamCode } from '@/constants/Colors';
import { BIG_TEAMS, TERRITORIES } from '@/constants/territories';
import { Button, Chip, Field, FullScreen, Subtitle, Title, Muted, Card } from '@/components/ui/Primitives';
import type { Role } from '@/lib/types';

const ROLES: { id: Role; label: string }[] = [
  { id: 'player', label: '細組 / Freshmen' },
  { id: 'ec', label: '跟組 EC' },
  { id: 'oec', label: 'OEC（站崗）' },
  { id: 'admin', label: 'OC Admin' },
];

export default function LoginScreen() {
  const { login, usingRemote } = useAuth();
  const router = useRouter();
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
      Alert.alert('登入失敗', result.error);
      return;
    }
    if (role === 'admin') router.replace('/(admin)');
    else if (role === 'oec') router.replace('/(oec)');
    else router.replace('/(player)/map');
  };

  return (
    <FullScreen>
      <ScrollView contentContainerStyle={{ gap: 18, paddingBottom: 40 }}>
        <View>
          <Text style={styles.brand}>CU HUNT</Text>
          <Title>中大尋獵</Title>
          <Subtitle>Orientation camp · 陣地 · 錦囊 · 實時分數</Subtitle>
          <Muted>
            {usingRemote ? '已連接 Supabase（多人即時同步）' : '本機 Demo 模式（未設定 Supabase）'}
          </Muted>
        </View>

        <Card>
          <Text style={styles.section}>身份</Text>
          <View style={styles.row}>
            {ROLES.map((r) => (
              <Chip
                key={r.id}
                label={r.label}
                selected={role === r.id}
                onPress={() => setRole(r.id)}
              />
            ))}
          </View>
        </Card>

        {(role === 'player' || role === 'ec') && (
          <Card>
            <Text style={styles.section}>大組</Text>
            <View style={styles.row}>
              {BIG_TEAMS.map((bt) => (
                <Chip
                  key={bt.code}
                  label={`${bt.code} ${bt.fullName}`}
                  selected={bigTeam === bt.code}
                  color={TeamColors[bt.code]}
                  onPress={() => setBigTeam(bt.code)}
                />
              ))}
            </View>
            <Text style={[styles.section, { marginTop: 12 }]}>細組</Text>
            <View style={styles.row}>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <Chip
                  key={n}
                  label={`${bigTeam}${n}`}
                  selected={smallNum === n}
                  color={TeamColors[bigTeam]}
                  onPress={() => setSmallNum(n)}
                />
              ))}
            </View>
          </Card>
        )}

        {role === 'oec' && (
          <Card>
            <Text style={styles.section}>負責陣地</Text>
            <View style={styles.row}>
              {TERRITORIES.map((t) => (
                <Chip
                  key={t.id}
                  label={`${t.id} ${t.name}`}
                  selected={territoryId === t.id}
                  onPress={() => setTerritoryId(t.id)}
                />
              ))}
            </View>
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
      </ScrollView>
    </FullScreen>
  );
}

const styles = StyleSheet.create({
  brand: {
    color: Colors.accentWarm,
    fontWeight: '700',
    letterSpacing: 3.5,
    fontSize: 12,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  section: {
    color: Colors.text,
    fontWeight: '700',
    marginBottom: 12,
    fontSize: 14,
    letterSpacing: -0.2,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
});
