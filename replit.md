# KonuTakip

YKS (Turkish university entrance exam) study tracker — an Expo mobile app with a supporting Express API server.

## Run & Operate

- **KonuTakip (mobile):** `artifacts/konutakip: expo` workflow — `pnpm --filter @workspace/konutakip run dev`
- **API Server:** `artifacts/api-server: API Server` workflow — `pnpm --filter @workspace/api-server run dev` (serves on port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only; production schema handled by Replit Publish)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Mobile: Expo ~54 (SDK 54), Expo Router ~6, React Native 0.81.5
- API: Express 5
- DB: PostgreSQL + Drizzle ORM (schema currently empty — `lib/db/src/schema/index.ts`)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from `lib/api-spec/openapi.yaml`)
- Build: esbuild (ESM bundle, `.mjs` output)

## Where things live

- `artifacts/konutakip/` — Expo mobile app
  - `app/` — Expo Router screens (file-based routing)
  - `app/(tabs)/` — tab bar screens
  - `components/` — shared UI components
  - `contexts/` — React context providers
  - `constants/colors.ts` — design tokens
  - `data/` — static data
- `artifacts/api-server/src/` — Express server
  - `routes/` — API route handlers
  - `lib/` — logger and shared utilities
- `lib/db/src/schema/` — Drizzle schema (export tables here)
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for all endpoints)
- `lib/api-client-react/` — generated React Query hooks (don't edit manually)
- `lib/api-zod/` — generated Zod schemas (don't edit manually)

## Architecture decisions

- Expo app uses AsyncStorage for all local persistence (no DB calls from mobile)
- OpenAPI spec is the single source of truth — add endpoints there, then run codegen
- API server uses esbuild bundle for fast startup; rebuild required for dev changes (`pnpm run dev` does build + start)
- DB schema is intentionally empty in the template; add tables to `lib/db/src/schema/`

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- `expo-notifications@57.0.2` is one major version ahead of what Expo 54 expects (`~0.32.17`); update if notification features cause issues
- The API server `dev` script rebuilds on every start (esbuild is fast, ~400ms)
- Do NOT create `app.config.ts` or `app.config.js` — must use static `app.json` for Expo Launch compatibility
- Do NOT run `npx expo start` directly in shell — always use the managed workflow so PORT and env vars are injected

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See the `expo` skill for Expo-specific patterns and pitfalls
