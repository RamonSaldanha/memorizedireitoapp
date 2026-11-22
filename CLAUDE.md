# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

This is an Expo-managed React Native app. There is no test runner, linter, or formatter configured.

- `npm start` — start the Metro bundler / Expo dev server (`expo start`)
- `npm run android` / `npm run ios` / `npm run web` — start with a specific platform target
- TypeScript check: `npx tsc --noEmit` (strict mode is on, extending `expo/tsconfig.base`)

### Over-the-air updates (EAS Update)
`expo-updates` is installed (since 21/11/2026). Builds listen on the channel of their `eas.json` profile (`preview` = the test APK, `production` = the store). JS/asset changes ship with `npx eas-cli update --channel preview --message "..."` (or `production`); the app downloads on launch and applies on the next launch. `runtimeVersion` follows `version` in `app.json` (`appVersion` policy): an update only reaches builds with the same `version`, so bump `version` and make a new build whenever native code changes (new native module, permission, Expo SDK, icon). Free plan: 1,000 monthly users who download an update.

The app's New Architecture is enabled (`app.json` → `newArchEnabled: true`), so any added native module must be Fabric/TurboModules-compatible.

## Architecture

### Mobile companion to a web app
This RN app (`memorize-mobile`) is a client for **Memorize Direito**, a study app for Brazilian law. It talks to the same Laravel backend as the web app at `https://memorizedireito.com/api/v1` — both `__DEV__` and prod hit production in [src/api/client.ts](src/api/client.ts). User-facing copy is in **Portuguese (pt-BR)**.

The play screens are intentionally being aligned **pixel-perfect with the web version** (Vue). The map grid in [src/screens/trail/TrailMapScreen.tsx](src/screens/trail/TrailMapScreen.tsx) (`COLUMNS`, `COLUMN_PATTERN`, `ROW_STEP`) mirrors the web's `BetaPlay/Map.vue`, and the palette in [src/theme/colors.ts](src/theme/colors.ts) mirrors the web's Tailwind config.

### Boot sequence
[App.tsx](App.tsx) wraps everything in `QueryClientProvider` (TanStack Query, `staleTime: 30s`, `retry: 1`) and renders `AppBootstrap`, which:
1. Calls `useAuthStore.initialize()` — reads the Sanctum token from `expo-secure-store` (key `sanctum_token`) and loads it into the store. The "Carregando..." screen blocks rendering until this completes.
2. When `token` becomes truthy, fetches `/me` and pushes the result into both `authStore` (full user) and `userStore` (gameplay-relevant fields: `energy`, `has_infinite_lives`, `xp`).
3. Renders `RootNavigator`, which **switches between `AuthStack` and `AppTabs` purely based on `authStore.token`** ([src/navigation/RootNavigator.tsx](src/navigation/RootNavigator.tsx)). There is no explicit "logout navigation" — clearing the token is what unmounts the app stack.

### API layer pattern
All HTTP goes through the single `apiClient` axios instance in [src/api/client.ts](src/api/client.ts):
- A request interceptor reads the token from SecureStore on **every** request and attaches `Authorization: Bearer …`. The store's `token` is for navigation gating; the actual request token comes from SecureStore.
- A response interceptor on `401` **deletes the SecureStore token silently** but does **not** update the Zustand store. The store stays out-of-sync until the next state change triggers a re-read. If you add new auth-failure paths, prefer calling `useAuthStore.getState().logout()` to keep both in sync.

Per-domain API modules (`auth.ts`, `play.ts`, `disciplines.ts`, `legalReferences.ts`, `ranking.ts`) export `…Api` objects of plain methods returning `apiClient.<verb>(…)` promises. Screens consume them via `useQuery` / `useMutation` from `@tanstack/react-query` — there is no shared query-key convention yet.

### State: two Zustand stores with deliberate separation
- [authStore](src/stores/authStore.ts) — `token`, `user` (full `UserData`), persistence via SecureStore. Drives navigation.
- [userStore](src/stores/userStore.ts) — gameplay HUD state (`energy`, `hasInfiniteLives`, `xp`, plus `name`/`avatar` for the header; `lives` stays for old servers). Energy and XP from the `/trail` responses are pushed here (`setEnergy`, `updateFromApi`) so the header updates without a re-fetch of `/me`.

The split exists because gameplay endpoints return fresh `energy`/`xp` snapshots in their responses; updating `userStore` directly avoids stale HUD values without invalidating auth state.

### Navigation shape
- Root: native-stack with `Auth` | `App` (token-gated).
- `AppTabs` (bottom tabs): `Jogar`, `Conquistas`, `Ranking`, `Leis`, `Perfil`. The `Jogar` tab embeds its own native-stack (`PlayStack`) with `PlayMap` (the square map) → `TrailPhase` / `TrailChallenge` / `TrailExam`. `Ranking` and `Perfil` have stacks too, both with `PublicProfile`. When adding a new play-flow screen, add it to `PlayStackParamList` in [src/navigation/AppTabs.tsx](src/navigation/AppTabs.tsx); when adding a top-level destination, add a tab there.

### New map (squares)
Port of the web's beta map (`BetaPlay/Map.vue`, `Phase.vue`, `Checkpoint.vue`, `Exam.vue`), through the `/trail` API routes ([src/api/trail.ts](src/api/trail.ts)). The server builds the data with the same methods as the web, so the rules live there (see the web project's CLAUDE.md, "Material de estudo" and "Mapa novo no app").
- It is the app's only map: [TrailMapScreen](src/screens/trail/TrailMapScreen.tsx) replaced the old `/play/map` map (the old screens were removed on 19/11/2026). Every logged-in user can use `/trail`; on the web the beta stays admin-only. Older app builds keep using `/play/*`, which stays on the server.
- Map: same grid as the web (6 columns of `U`, pattern center → right → center → left, `ROW_STEP` 2.6), squares of 4 phases plus the square challenge as 5th step, the Dia da prova beside the last square of each stage. The stage card sits above the scroll and shows the stage in the middle of the screen.
- Phase ([TrailPhaseScreen](src/screens/trail/TrailPhaseScreen.tsx)): the whole phase stays on the device. Every checked block calls `/trail/attempt` (energy goes at once, combos come back) and a wrong one comes back blank; the end sends every block to `/trail/finish`. Leaving midway loses the phase, and so does running out of energy midway.
- Square challenge ([TrailChallengeScreen](src/screens/trail/TrailChallengeScreen.tsx)): summary with guided reading, then the questions; each step is saved on the server right away. The summary arrives as `summary_blocks` and [GuidedSummary](src/components/trail/GuidedSummary.tsx) draws it word by word (chunk or line mode, speed, tap a word to jump, hold to pause, 90% coverage to unlock "Concluir"). The web's panel can be dragged; here it is fixed at the bottom right.
- Dia da prova ([TrailExamScreen](src/screens/trail/TrailExamScreen.tsx)): the server owns the deadline; the clock only shows it and, when the app comes back to the foreground, asks the server again.
- Shared pieces in [TrailUi](src/components/trail/TrailUi.tsx): top bar, `ResultBar` (plays the correct sound), `PhaseComplete`, `ChoiceList` (swipe right to strike an option), `ConfirmSheet`.
- Sounds: `assets/audio/correct.wav` and `phase-complete.wav` are the web's Web Audio chimes (`resources/js/lib/sounds.ts`) rendered to files by `npm run sounds` ([scripts/render-sounds.mjs](scripts/render-sounds.mjs)): same notes, envelope and volume, no extra gain (it matched Chrome's OfflineAudioContext sample by sample). Change a chime on the web, change it there too. Played by [useGameSounds](src/hooks/useGameSounds.ts). The onboarding keeps `bell-win.wav`, like the web's onboarding.

### Energy (instead of lives)
The map uses energy, like the web's beta (rules in the web's `EnergyService`, numbers in its `config/energy.php`; see the web CLAUDE.md, "Energia"). Bar of 25, +1 per hour, a new phase needs 10 to open, a right block costs 1 and a wrong one 2, 5 right in a row give 1 back (with a full bar, getting everything right gives 2 phases at most: 25, 17, 9); review opens with 1, costs like a new phase and has no combo (reviewing doesn't recharge); the square challenge costs 1 per new question (combo of 3) and redoing a done one costs 1 per question, no combo; the first Dia da prova of a stage gives energy and can go up to 50, a retake costs 5 to start and gives nothing (`no_energy` 403 goes to NoEnergy); the ad gives 5; Premium is infinite.
- The server decides: phase and challenge answer `no_energy` (403) and the screens go to [NoEnergyScreen](src/screens/play/NoEnergyScreen.tsx), drawn like the end-of-phase Premium invite (the tired runner `sem-energia.gif`, the highlighted title, the countdown from `/trail/energy`, the yearly plan, the ad via `/trail/energy/reward`, "Esperar a recarga"). The map doesn't gate.
- The yearly card, blue button and highlighter word are shared by both screens in [PremiumPieces](src/components/trail/PremiumPieces.tsx) (prices equal to the web's `resources/js/lib/premium.ts`).
- [EnergyPill](src/components/ui/EnergyPill.tsx) is the battery with a bolt (the bolt alone is XP), in the header and the top bar of the phase, challenge and exam.
- Golden rule (kept by the web's `EnergyTest`): even getting everything right, the energy runs out.
- `lives` stays on the server for the old site and old app builds; `/trail/fail` only exists for builds before energy.

### Premium and end-of-phase screens
Same pattern as the web's end-of-phase invite: solid background, a GIF in the same-size frame, the highlighted title and one main action.
- [PremiumPieces](src/components/trail/PremiumPieces.tsx): the yearly card, the blue button, the highlighter word (`Marked`) and `PerkList` (the perks as chips, no icon or description, entering one by one). Prices and perks match the web's `resources/js/lib/premium.ts`.
- [PhaseEnd](src/components/trail/PhaseEnd.tsx): result → (if the phase gave a star) achievement screen → (non-subscribers) Premium invite → map, always through the highlighter sweep. The star is no longer an overlay; phase and challenge pass `levelUp`. The sweep's exit waits ~120 ms after the new screen mounts, or Android drops its first frames and it looks like it vanishes at once.
- [OfferStep](src/components/onboarding/OfferStep.tsx) (onboarding welcome offer) uses `presente.gif`, the highlighted "plano anual" and `PerkList`.

### Word bank
Like the web: the bank keeps every word in its place, a used word leaves an empty slot ([WordChip / EmptyWordSlot](src/components/game/WordChip.tsx)) and the word in the gap has the same chip look; tapping it sends it back. [useGapSelections](src/hooks/useGapSelections.ts) remembers which bank button each gap came from. Pass `bank` to `PhaseControls` to get this layout (the map and the onboarding both do).

### Achievements and public profile
- Conquistas uses stars (`stars`, `next_star_xp`, `badge_url` from `/disciplines`) with [StarBadge / StarRow](src/components/ui/StarBadge.tsx); a discipline without new art falls back to the old `DisciplineBadge`. `LevelUpOverlay` shows the star when the server sends `stars`.
- Each ranking row opens [PublicProfileScreen](src/screens/PublicProfileScreen.tsx) (`/profiles/{uuid}`). The Perfil tab edits the bio, which achievements show on the public profile, the reminder e-mails (`/settings`) and deletes the account (`DELETE /profile` with the password).

### Avatar
The avatar is drawn by the **same code as the web**: [src/lib/avatar/](src/lib/avatar/) is a byte-for-byte copy of `resources/js/lib/avatar/` from the web project (pure TS that builds an SVG string from `avatar_config`). **Never edit it here** — change it on the web and run `npm run avatar:sync` (`npm run avatar:check` fails if the copy drifted; `AVATAR_LIB` overrides the default source `../code/memorize/...`).
- Rendering: `SvgXml` from `react-native-svg` ([src/components/ui/Avatar.tsx](src/components/ui/Avatar.tsx) for circles, [AvatarStage](src/components/avatar/AvatarStage.tsx) for the profile/editor stage).
- Editor: [AvatarEditorScreen](src/screens/profile/AvatarEditorScreen.tsx) uses `EDITOR_TABS`/`previewWith` from the lib, so tabs and thumbnails match the web editor. Saves via `PUT /profile/avatar`; the server validates ids, `#rrggbb` colors and subscriber-only costumes.
- Change animation: [AnimatedAvatar](src/components/avatar/AnimatedAvatar.tsx) parses the lib's `animated: true` SVG and swaps its three hooks (`avatar-head`, `avatar-body`, `avatar-lid`) for components driven by [motion.ts](src/components/avatar/motion.ts), whose keyframes are copied from the web's `AvatarPreview.vue` — keep both in sync.
- State: `userStore.avatarConfig` (from `avatar_config` on `/me`, login and register) feeds the header, the Perfil tab icon and the profile.

### Onboarding
Port of the web's `Onboarding/Index.vue` (same 8 steps, copy, colors and animations): welcome → goal → area → minutes/day → suggested trail → one real game block (+25 XP) → avatar teaser → 15% off the yearly plan for 24h, plus the "Tem certeza que quer pular?" sheet.
- Who sees it: only accounts created by this app. `authApi.register` sends `onboarding: true`; the server leaves the onboarding pending and `UserResource` returns `needs_onboarding: true`. Older app builds don't send the flag and get it marked as done.
- Gating: `authStore.onboardingPending` (persisted in AsyncStorage `@onboarding_pending`, read in `initialize()` with the token) makes [RootNavigator](src/navigation/RootNavigator.tsx) show `Onboarding` instead of `App`. Finishing or skipping clears it; so do logout and a 401.
- API: `/onboarding` (GET) and `/onboarding/{trail,challenge,offer,finish}` (POST) in [src/api/onboarding.ts](src/api/onboarding.ts). The POSTs return 409 once the onboarding is done; the screen then just leaves.
- [src/lib/onboarding/quiz.ts](src/lib/onboarding/quiz.ts) is a **byte-for-byte copy** of the web's `resources/js/components/onboarding/quiz.ts` (questions, trail suggestion, challenge articles). Don't edit it here; change it on the web and copy it over. `demoAvatars.ts` is the web's landing avatars with only the import changed.
- The challenge reuses `ActiveChallenge`, `PhaseControls` and `CompletedSegmentView`; word selection lives in [useGapSelections](src/hooks/useGapSelections.ts), shared with `TrailPhaseScreen`.
- Animations in [src/components/onboarding/motion.tsx](src/components/onboarding/motion.tsx) mirror the CSS keyframes of the web page (same curves, durations, delays) and respect "reduce motion".
- The welcome offer (`welcome_offer` on `/me`) shows as [WelcomeOfferBanner](src/components/WelcomeOfferBanner.tsx) under the map header. "Garantir" opens the web subscription page, which already applies the discount on the yearly plan.

### Styling
NativeWind + Tailwind are installed, but most existing screens use `StyleSheet.create` with values pulled from [src/theme/colors.ts](src/theme/colors.ts), [src/theme/typography.ts](src/theme/typography.ts), [src/theme/shadows.ts](src/theme/shadows.ts). Match the surrounding file's approach rather than mixing in Tailwind classes ad-hoc — the theme tokens are the source of truth that keeps parity with the web.

### Button family and paper tone
Same system as the web (its `docs/design/componentes.html` and the `.mz-*` classes in `resources/css/app.css`), applied on 20/11/2026.
- **Paper tone:** `colors.gray` is the warm paper scale, `colors.background`/`card`/`dark` are the paper tokens, and `colors.family` + `familyTokens(isDark)` hold the family colors (brand yellow, danger, choice blue, right/wrong, soft tones). Change them together with the web.
- **Buttons:** always [GameButton](src/components/ui/GameButton.tsx). Variants that sink: `main` (yellow, one per screen), `second`, `danger`, `success` (only the result bar), `premium` (purple, only Premium and Dia da prova). Calm ones: `tonal`, `tonal-brand`, `tonal-danger`, `outline`, `dashed`, `ghost`. Sizes `xs`/`sm`/`md`/`lg` = 32/40/48/56. `square` for icon-only, `pill` for chips. Old names (`green`, `purple`, `blue`, `white`, `red`) still map to the family. Margins in `style` go to the whole block.
- **Choices:** [ChoiceCard / ChoiceKey / choiceLook](src/components/ui/ChoiceCard.tsx): blue when chosen, green/red when graded. Only what you press has a base; notices (like [Toast](src/components/ui/Toast.tsx)) are flat, colored by type.
