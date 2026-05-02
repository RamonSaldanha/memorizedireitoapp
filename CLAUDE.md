# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

This is an Expo-managed React Native app. There is no test runner, linter, or formatter configured.

- `npm start` — start the Metro bundler / Expo dev server (`expo start`)
- `npm run android` / `npm run ios` / `npm run web` — start with a specific platform target
- TypeScript check: `npx tsc --noEmit` (strict mode is on, extending `expo/tsconfig.base`)

The app's New Architecture is enabled (`app.json` → `newArchEnabled: true`), so any added native module must be Fabric/TurboModules-compatible.

## Architecture

### Mobile companion to a web app
This RN app (`memorize-mobile`) is a client for **Memorize Direito**, a study app for Brazilian law. It talks to the same Laravel backend as the web app at `https://memorizedireito.com/api/v1` — both `__DEV__` and prod hit production in [src/api/client.ts](src/api/client.ts). User-facing copy is in **Portuguese (pt-BR)**.

The play screens are intentionally being aligned **pixel-perfect with the web version** (Vue). Layout constants in [src/screens/play/PlayMapScreen.tsx](src/screens/play/PlayMapScreen.tsx) (`VERTICAL_SPACING`, `X_PATTERN`, `PHASE_SIZE`) and the palette in [src/theme/colors.ts](src/theme/colors.ts) mirror the web's Tailwind config. See [plano-atualizacao.md](plano-atualizacao.md) for the in-progress map refactor plan and known visual deltas.

### Boot sequence
[App.tsx](App.tsx) wraps everything in `QueryClientProvider` (TanStack Query, `staleTime: 30s`, `retry: 1`) and renders `AppBootstrap`, which:
1. Calls `useAuthStore.initialize()` — reads the Sanctum token from `expo-secure-store` (key `sanctum_token`) and loads it into the store. The "Carregando..." screen blocks rendering until this completes.
2. When `token` becomes truthy, fetches `/me` and pushes the result into both `authStore` (full user) and `userStore` (gameplay-relevant fields: `lives`, `has_infinite_lives`, `xp`).
3. Renders `RootNavigator`, which **switches between `AuthStack` and `AppTabs` purely based on `authStore.token`** ([src/navigation/RootNavigator.tsx](src/navigation/RootNavigator.tsx)). There is no explicit "logout navigation" — clearing the token is what unmounts the app stack.

### API layer pattern
All HTTP goes through the single `apiClient` axios instance in [src/api/client.ts](src/api/client.ts):
- A request interceptor reads the token from SecureStore on **every** request and attaches `Authorization: Bearer …`. The store's `token` is for navigation gating; the actual request token comes from SecureStore.
- A response interceptor on `401` **deletes the SecureStore token silently** but does **not** update the Zustand store. The store stays out-of-sync until the next state change triggers a re-read. If you add new auth-failure paths, prefer calling `useAuthStore.getState().logout()` to keep both in sync.

Per-domain API modules (`auth.ts`, `play.ts`, `disciplines.ts`, `legalReferences.ts`, `ranking.ts`) export `…Api` objects of plain methods returning `apiClient.<verb>(…)` promises. Screens consume them via `useQuery` / `useMutation` from `@tanstack/react-query` — there is no shared query-key convention yet.

### State: two Zustand stores with deliberate separation
- [authStore](src/stores/authStore.ts) — `token`, `user` (full `UserData`), persistence via SecureStore. Drives navigation.
- [userStore](src/stores/userStore.ts) — gameplay HUD state (`lives`, `hasInfiniteLives`, `xp`, plus `name`/`avatar` for the header). Mutations from `playApi.saveProgress` / `rewardLife` responses should be pushed here via `updateFromApi` so the header updates without a re-fetch of `/me`.

The split exists because gameplay endpoints return fresh `lives`/`xp` snapshots in their responses; updating `userStore` directly avoids stale HUD values without invalidating auth state.

### Navigation shape
- Root: native-stack with `Auth` | `App` (token-gated).
- `AppTabs` (bottom tabs): `Jogar`, `Conquistas`, `Ranking`, `Leis`. The `Jogar` tab embeds its own native-stack (`PlayStack`) with `PlayMap` → `PlayPhase`. When adding a new play-flow screen, add it to `PlayStackParamList` in [src/navigation/AppTabs.tsx](src/navigation/AppTabs.tsx); when adding a top-level destination, add a tab there.

### Styling
NativeWind + Tailwind are installed, but most existing screens use `StyleSheet.create` with values pulled from [src/theme/colors.ts](src/theme/colors.ts), [src/theme/typography.ts](src/theme/typography.ts), [src/theme/shadows.ts](src/theme/shadows.ts). Match the surrounding file's approach rather than mixing in Tailwind classes ad-hoc — the theme tokens are the source of truth that keeps parity with the web.
