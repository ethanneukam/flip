# AGENTS.md

## Cursor Cloud specific instructions

### Project Overview

FLIP is a real-time resale/trading platform with three components:

| Component | Tech | Directory | Run Command |
|---|---|---|---|
| **Web App** (primary) | Next.js 13 (Pages Router) | `/workspace` | `npm run dev` |
| **Terminal Engine API** | Python FastAPI | `/workspace/flip-terminal-engine` | `cd flip-terminal-engine && source venv/bin/activate && uvicorn main:app` |
| **Mobile App** | React Native (Expo) | `/workspace/flip-mobile` | `cd flip-mobile && npx expo start` |

### Running the Web App

- Start with `npm run dev` (Next.js dev server on port 3000).
- The `build` script is `echo 'Skipping build'` — there is no production build configured.
- TypeScript checking is disabled in `next.config.cjs` (`ignoreBuildErrors: true`). Running `npx tsc --noEmit` will show pre-existing errors (e.g., syntax error in `scripts/bootstrap.ts`).
- No ESLint config exists for the root project. No test scripts are configured.

### Key Gotchas

- **Duplicate page crash**: `pages/api/coins/award.js` was removed because it duplicated `pages/api/coins/award.ts`. Having both files alongside the `app/` directory caused a Watchpack crash in `next dev`. If someone re-introduces a duplicate page file while `app/` exists, the dev server will crash immediately.
- **Extension-less files**: `pages/_pricing` (empty), `pages/pp` (no extension), and `pages/login/tsx` (file named `tsx`, not `.tsx`) are present but harmless since Next.js ignores files without recognized extensions.
- **Supabase env vars**: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` must be set in `.env.local` for the middleware to work. Without them, all non-API routes return 500. The anon key is already committed in `flip-mobile/lib/supabase.ts` and `flip-terminal-engine/.env`.
- **Watchpack permission warnings**: The dev server logs `EACCES: permission denied` errors for system directories (`/etc/credstore`, `/root/.ssh`, etc.) — these are harmless in the Cloud VM environment.
- **No index page**: There is no `pages/index.tsx`. The middleware redirects `/` to `/auth` (unauthenticated) or `/charts` (authenticated).

### External Services

The app depends on **Supabase** (PostgreSQL + Auth) as the primary backend. Stripe, Shippo, PostHog, Sentry, Firebase, and Google Cloud Vision are used but the app gracefully degrades without them. Test API keys for Stripe and Shippo are in `.env.local`.
