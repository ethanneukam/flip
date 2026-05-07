# AGENTS.md

## Cursor Cloud specific instructions

### Project Overview

Flip is a resale/flipping marketplace with AI-powered pricing intelligence. The monorepo contains:

| Service | Directory | Stack | Dev Command |
|---------|-----------|-------|-------------|
| Web App (primary) | `/workspace` | Next.js 13, React 18, Tailwind | `npm run dev` |
| Terminal Engine API | `/workspace/flip-terminal-engine` | Python FastAPI | `source venv/bin/activate && uvicorn main:app --port 8000` |
| Mobile App | `/workspace/flip-mobile` | Expo/React Native | Not runnable in cloud VM |

### Critical Gotchas

- **Node.js version**: Must use Node.js 20 (via `nvm use 20`). Node 22 causes Watchpack crashes with Next.js 13.
- **Duplicate page files**: `pages/api/coins/award.js` was removed because having both `.js` and `.ts` files for the same route crashes the Next.js dev server's file watcher. If similar crashes occur, check for duplicate route files.
- **Next.js version**: The `package.json` specifies `"next": "^13.4.12"`. Without a lock file, npm resolves to ~13.5.x which works. Exact version 13.4.12 has a known Watchpack bug with `app/` + `pages/` coexistence.
- **Build script**: `npm run build` just echoes "Skipping build" - this is intentional. The project is meant to be run in dev mode only.
- **TypeScript strict mode is OFF**: The tsconfig has `strict: false` and `noImplicitAny: false`. Type errors are expected and do not block development.

### Environment Variables

The `.env.local` file must contain `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` for the app to connect to the database. These are already configured.

### Running Services

**Next.js Web App:**
```bash
source ~/.nvm/nvm.sh && nvm use 20
npm run dev
# Serves on http://localhost:3000
```

**FastAPI Terminal Engine:**
```bash
cd flip-terminal-engine
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000
# Docs at http://localhost:8000/developer/playground
```

### Testing

- **TypeScript check**: `npx tsc --noEmit` (will show errors in scripts/ - these are pre-existing)
- **No ESLint config** exists for the main web app
- **No automated test suite** exists for the main web app
- **FastAPI**: health check at `GET /` returns `{"status":"TERMINAL_ENGINE_ONLINE","node":"01"}`
