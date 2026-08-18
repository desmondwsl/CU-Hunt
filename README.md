# CU Hunt

Mobile-first **React web** app for CUHK orientation camp hunt day (Vite + React Router + Supabase).

## Architecture

- **Supabase-first** when `.env` has credentials: all devices share one live game state.
- Writes go through **server RPCs** (PIN-checked). Tables are **read-only** via RLS.
- **OEC** is bound to the territory chosen at login; **EC** is bound to their 細組.
- Session in `localStorage`; PIN in `sessionStorage`.
- Fallback **local demo mode** (`localStorage`) if Supabase is not configured.

## Setup

### 1. Env

```bash
# .env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### 2. Database

In Supabase SQL editor, run in order:

1. `supabase/migrations/001_init.sql`
2. `supabase/seed.sql`
3. `supabase/migrations/002_rls_and_rpcs.sql`
4. `supabase/migrations/003_scoring_and_binding.sql`
5. `supabase/migrations/004_bank_hold_minutes.sql`
6. `supabase/migrations/005_fix_reset_safeupdate.sql`
7. `supabase/migrations/006_team_colors_and_event_place.sql` ← 大組顏色 + 突發時間／地點

### 3. Run

```bash
npm install
npm run dev
```

Open the URL Vite prints (default `http://localhost:5173`). On a phone, use your machine’s LAN IP on the same Wi‑Fi.

Login shows **已連接 Supabase** when env is loaded.

## Roles & PINs

PINs live in Supabase table `role_pins`. Defaults after seed:

| Role | PIN | Bound to |
|------|-----|----------|
| 細組 / Freshmen | `1234` | 大組 + 細組 (view) |
| 跟組 EC | `2222` | that 細組 only (錦囊) |
| OEC | `3333` | that territory only (capture) |
| OC Admin | `9999` | unbound |

## Project layout

- `src/pages/player` — freshmen + EC
- `src/pages/oec` — station capture
- `src/pages/admin` — OC tools
- `src/lib/remoteGame.ts` — Supabase fetch / RPC / realtime
- `src/lib/gameStore.ts` — facade (remote or local)
- `src/lib/gameEngine.ts` — local scoring / offline demo
- `supabase/migrations/` — schema + RLS + RPCs

## Build

```bash
npm run build
npm run preview
```
