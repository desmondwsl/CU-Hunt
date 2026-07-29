# CU Hunt

Expo React Native app that replaces AppSheet + Google Forms for CUHK orientation camp hunt day.

## Architecture (current)

- **Supabase-first** when `.env` has credentials: all devices share one live game state.
- Writes go through **server RPCs** (PIN-checked). Tables are **read-only** via RLS.
- **OEC** is bound to the territory chosen at login; **EC** is bound to their 細組.
- Session PIN is stored in **SecureStore** (AsyncStorage on web).
- Fallback **local demo mode** (AsyncStorage) if Supabase is not configured.

## Setup

### 1. Env

```bash
# .env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### 2. Database

In Supabase SQL editor, run in order:

1. `supabase/migrations/001_init.sql`
2. `supabase/seed.sql`
3. `supabase/migrations/002_rls_and_rpcs.sql`
4. `supabase/migrations/003_scoring_and_binding.sql` ← linkages fix + OEC/EC binding

If you already ran 001–002 earlier, just run **003**.

### 3. Run

```bash
npm install
npx expo start
```

Login screen shows **已連接 Supabase** when env is loaded.

## Roles & PINs

PINs live in Supabase table `role_pins` (not shown in the app UI). Defaults after seed:

| Role | PIN | Bound to |
|------|-----|----------|
| 細組 / Freshmen | `1234` | 大組 + 細組 (view) |
| 跟組 EC | `2222` | that 細組 only (錦囊) |
| OEC | `3333` | that territory only (capture) |
| OC Admin | `9999` | unbound (override anything) |

Rotate before camp:

```sql
update role_pins set pin = 'NEW_PIN' where role = 'admin';
```

## Game rules

- 25 territories, 3 大組 × 6 細組
- Easy 50 pts/min · Hard 70 pts/min while held
- 15 min cooldown after capture
- Cannot capture own 大組 territory
- Capture / item / settle cutoffs in `game_settings`
- Linkages after **10 min continuous hold** (oldest hold in the set; checked on capture + every ~60s)
- Curses (−4000) while a 大組 holds a full curse set for 10+ minutes
- 錦囊: 60% 抽唔到 on capture; 閘住反彈 defense
- Relics: Engine大粒嘢, Jam野
- Min 12 tasks else −5% each missing; late −35%

## Camp distribution

```bash
eas build --profile preview --platform android
eas build --profile preview --platform ios
```

Replace `extra.eas.projectId` in `app.json` before real EAS builds.

Broadcasts appear in the **廣播** tab (and OEC station feed). Device push fan-out is not wired yet.

## Project layout

- `app/(player)` — freshmen + EC
- `app/(oec)` — station capture
- `app/(admin)` — OC tools
- `lib/remoteGame.ts` — Supabase fetch / RPC / realtime
- `lib/gameStore.ts` — facade (remote or local)
- `lib/gameEngine.ts` — local scoring / offline demo
- `supabase/migrations/` — schema + RLS + RPCs
