# DawgHub — UGA student community app

## Project overview

A PWA for University of Georgia (UGA) students — community board, class schedule, campus map, and dining menu in one app.
- **Sign-up restriction**: `@uga.edu` email only (Cognito Pre-signup Lambda, server-side validation)
- **Tech stack**: React 19 + TypeScript + Vite · Emotion styled-components · i18next (en/ko) · AWS Amplify Gen2 (Cognito + AppSync/GraphQL + DynamoDB) · Leaflet (map)

---

## Local development

```bash
pnpm install
pnpm dev              # vite dev server
pnpm build            # tsc -b && vite build
pnpm sandbox:once --profile dawghub   # one-time deploy after an Amplify backend schema change
```

⚠️ **AWS profile**: this project uses the `dawghub` AWS profile. Running `pnpm sandbox`/`sandbox:once` without the profile picks up the default profile (a different account) and produces an `SSMCredentialsError` — always deploy the backend as `npx ampx sandbox --once --profile dawghub`. Cognito admin commands (`aws cognito-idp admin-create-user`, etc.) likewise need `--profile dawghub`.

Adding/modifying a model in `amplify/data/resource.ts` must be deployed with `pnpm sandbox:once` (including the profile above) before the frontend can actually use it (it is not just a local type refresh — the AppSync schema itself changes).

---

## Testing

```bash
pnpm test          # vitest run — unit + component tests
pnpm test:watch    # vitest, watch mode
pnpm test:e2e      # playwright test (starts its own dev server)
pnpm test:e2e:ui   # playwright test --ui
```

- **Unit tests** (`src/lib/**/*.test.ts`) — pure logic (`diningHours.ts`, `dining.ts`, `scheduleGrid.ts`, `ugaBuildings.ts`, `useFavorites.ts`, `passio.ts`'s `getBusRouteCode`, `directions.ts`'s `planTrip`). Colocated next to the source file, not in a separate `__tests__` folder.
- **Component tests** (`*.test.tsx`, also colocated) — use `src/test/renderWithProviders.tsx` (`MemoryRouter` + an isolated `QueryClient`) instead of hand-rolling providers per test. This is the permanent replacement for the old disposable `src/devharness/harness.tsx` + Playwright pattern previous sessions used and always deleted after one-off verification — don't recreate that pattern; extend `renderWithProviders`/`src/test/setup.ts` instead if a test needs something they don't yet provide.
- **E2E tests** (`e2e/*.spec.ts`, Playwright) — mock the network boundary rather than hitting the real deployed backend: `e2e/fixtures/mockGraphQL.ts` intercepts `**/graphql` by `operationName`, `e2e/fixtures/geolocation.ts` fully replaces `navigator.geolocation` so GPS timing (e.g. the origin-autofill race in MapPage) is deterministic instead of racy.
  - **Auth bypass**: `App.tsx` skips the real `<Authenticator>` login screen when `import.meta.env.VITE_E2E === 'true'` (set only by `playwright.config.ts`'s `webServer.env` — never by `pnpm dev`/`pnpm build`, so it can't leak into a real deploy).
  - **Limitation — `allow.owner()`/`allow.authenticated()` models can't be exercised this way**: Amplify's client resolves a Cognito JWT locally and throws *before* making any network request if there's no real signed-in session — since the E2E bypass skips Cognito sign-in entirely, `page.route('**/graphql')` never even gets a chance to intercept those calls (`ClassEntry`, `Post`/`Comment`, `Friendship`, `MapPreference`, and `getDiningMenu`/`getFriendSchedule` all fall in this bucket). Test flows built on these models as a Vitest component test instead, mocking `../../lib/amplifyClient`'s `client` export directly (see `SchedulePage.test.tsx`) — that sidesteps Amplify's auth resolution entirely. Reserve Playwright E2E for flows that are either backend-free (Settings' theme/language) or only touch public/apiKey-authorized operations.

---

## Git commits

- Commit messages in English, concise about what and why.
- Do **not** include a `Co-Authored-By: Claude ...` trailer — omit it even though it's Claude Code's default template. (User preference; past commits that had it were rewritten to remove it.)
- Do not commit until the user explicitly asks.

---

## Directory structure

```
src/
  app/
    App.tsx                # Routing (react-router-dom)
    AppShell/               # Responsive layout — mobile bottom tabs / tablet compact sidebar / desktop full sidebar
  design-system/            # Reusable building blocks
    colors.ts               #   - brand (static brand colors) · surface (re-exposes theme CSS variables) · state (UI state colors such as danger) · category (map/schedule category colors)
    typography.ts           #   - fontFamily.body/display, size, weight scales
    spacing.ts / radius.ts / shadow.ts / motion.ts   #   - 4px-grid spacing, radius (sm/md/lg/pill), elevation shadow, transition duration/easing tokens
    GlobalStyles.tsx         #   - defines :root CSS variables (light/dark theme), the --font-body/--font-display bridge, data-theme overrides
    Brand/Logo.tsx           #   - original bulldog mark SVG component (for in-app rendering)
    Skeleton/Skeleton.tsx    #   - shimmer block that imitates the real layout while loading (width/height/radius props)
    (Page, Card, Button, Input, Textarea, Select, IconButton, EmptyState, BackLink)
  app/ThemeContext.tsx      # Manual dark-mode switching (system/light/dark), persisted to localStorage `dawghub:theme`
  pages/
    community/  schedule/  map/  dining/  settings/    # Route-level pages (Page.tsx + Page.style.ts pairs; see ai/pages/ for details)
  lib/                       # Amplify data client, external API clients (Passio bus, UGA buildings/library/gym/dining data)
    queryClient.ts           #   - TanStack Query singleton (default staleTime 60s), wired via QueryClientProvider in main.tsx
    queryKeys.ts             #   - query keys shared by multiple pages (e.g. CLASS_ENTRIES_KEY — Schedule/Map share the same cache)
  i18n/locales/{en,ko}.json  # Translation resources — the two files always have the same key structure
amplify/
  auth/    # Cognito (email sign-in, @uga.edu domain-restricted pre-signup Lambda)
  data/    # AppSync/DynamoDB schema (Post, Comment, ClassEntry, MapPreference) + get-dining-menu custom query (Lambda)
public/
  brand/logo.svg             # Logo source (input to the PWA icon generation pipeline)
  brand/og-source.svg        # OG share image source
  pwa-*.png, maskable-icon-*.png, apple-touch-icon-*.png, favicon.ico   # generated by pwa-assets-generator (do not edit directly)
  og-image.png               # generated by scripts/generate-og-image.mjs (do not edit directly)
scripts/
  generate-og-image.mjs      # OG image regeneration script (og-source.svg → og-image.png)
pwa-assets.config.ts          # PWA icon generation config (@vite-pwa/assets-generator)
```

### How to update brand assets

- **When you change the logo**: edit `public/brand/logo.svg` → `pnpm assets:icons` (regenerates all favicon/apple-touch/PWA icons, written directly into `public/`) → also hand-match the inline path in `src/design-system/Brand/Logo.tsx` (there is no mechanism that auto-syncs the one SVG file into the React component).
- **When you change the OG share image**: edit `public/brand/og-source.svg` → `pnpm assets:og`.
- **Do not use UGA's official logos ("Power G", the arch wordmark, the mascot character) as-is in the logo** — they are trademark-protected. Reference only the brand color (`brand.primary` #BA0C2F) and a generic bulldog motif, drawn as an original.

---

## Per-page docs

The data sources and known quirks of a specific page are in `ai/pages/<Tab>/<Page>.md`. To fix one page, you only need to read that one doc.

| Tab | Folder |
|---|---|
| Community | `ai/pages/Community/` (CommunityPage, BoardPage, PostDetailPage) |
| Schedule | `ai/pages/Schedule/` (SchedulePage; the friend-schedule view is `FriendSchedulePage`, documented in the same file) |
| Map | `ai/pages/Map/` (MapPage) |
| Dining | `ai/pages/Dining/` (DiningPage, DiningHallDetailPage) |
| Settings | `ai/pages/Settings/` (SettingsPage) |

For the detailed background of the external data sources (Passio bus, Nutrislice dining, UGA ArcGIS buildings, LibCal library hours, Rec Sports gym PDF) and "does it auto-reflect when the website changes", see the "External data sources" section of README.md — it is domain knowledge and is not duplicated here.

---

## Style rules (must follow)

1. **No inline styles**: `style={{ ... }}` is forbidden (except where a library forces it, like Leaflet DOM manipulation). All styles go in a `*.style.ts` in the same directory.
2. **Dynamic styles via styled-component props**: as `styled.div<{ $active: boolean }>`. The `$` prefix marks a transient prop that is not passed through to the DOM.
3. **No hardcoded colors**: if you need a new color, add it to `src/design-system/colors.ts` first and import it. Use `surface.*` (CSS variables) if it must change with the theme (light/dark), and `brand.*`/`category.*`/`state.*` if it is always fixed.
4. **Emotion pattern**: export as `export const S = { Name: styled.div\`...\` }`, referenced by the consumer as `S.Name`.
5. **Fonts**: body text uses `var(--font-body)` (system font); emphasis text like page titles and the brand wordmark uses `var(--font-display)` (Oswald, Google Fonts) — see `fontFamily` in `typography.ts`.
6. **spacing/radius/shadow/motion tokens**: use `spacing.ts`/`radius.ts`/`shadow.ts`/`motion.ts` for a new component's spacing/corners/shadow/transition values instead of magic numbers. The existing per-page `.style.ts` files were not force-converted entirely to tokens — only the shared primitives (`Card`/`Button`/`IconButton`, etc.) and new components have them applied. `shadow.ts` holds a full elevation scale (`resting`/`hover`/`floating`/`card`/`fab`/`lg`/`modal`/`drawerRight`/`sheetUp`/`knob`/`tabActive`, plus the original `sm`/`md`) — if none of these fit a new surface, add a new named tier there instead of writing an inline `box-shadow: rgba(...)`.

### Dark mode

Controlled by `useTheme()` from `src/app/ThemeContext.tsx` (`theme: 'system'|'light'|'dark'`, `setTheme`). With `system`, `<html>` has no `data-theme` attribute (follows the OS setting); with `light`/`dark` it is a forced override. The user changes it directly on the Settings page (`/settings`). A new component that uses only CSS variables like `var(--bg)`/`var(--text)` will respond to the theme automatically — do not reference the `prefers-color-scheme` media query directly (it swallows the manual override).

### Responsive breakpoint conventions

- **768px**: mobile bottom tabs ↔ tablet/desktop sidebar switch (`AppShell`)
- **1024px**: tablet compact sidebar (icons only) ↔ desktop full sidebar (with labels) switch. The `Page` component's `max-width` also expands from 720px → 960px at this point.
- When making a new page you usually do not need to define a new breakpoint in the page itself — `Page`/`AppShell` already handle width-related layout. Add a desktop-only grid/layout with `@media (min-width: 1024px)` only for content-specific layout, like a horizontal-scrolling card list inside a page.

### No fixed top bar

An intentional decision: no page uses a fixed header/toolbar that always floats above the content. The page title (`PageTitle`) is treated as just part of the scrolling content. The Map page used to have an always-floating horizontal scrolling legend bar at the top too, but for consistency with the other tabs it was removed and replaced with a Google-Maps-style top-right circular "Layers" button + a drawer that slides in from the right on click (`S.LayersButton`/`S.Drawer`, `MapPage.tsx`) — when a control must float above the content, like on a map, use this "small button floating in a corner + a panel/drawer that opens only when needed" pattern, and do not build a fixed bar that spans the full width of the screen.

---

## Routing / code splitting / splash

- Every page in `src/app/App.tsx` is route-level code-split with `React.lazy` + `<Suspense>` — follow the `lazy(() => import('...').then((m) => ({ default: m.XxxPage })))` pattern when adding a new page too (pages are named exports, not default exports, so the `.then` wrapping is needed).
- `build.rollupOptions.output.manualChunks` in `vite.config.ts` splits `leaflet`/`aws-amplify`+`@aws-amplify/ui-react`/`@fortawesome/*` into separate vendor chunks each — consider adding here when you add a new heavy library.
- The `#splash` (brand splash) in `index.html` is removed by a `useEffect` in `src/app/App.tsx` at least 500ms after mount — based on "the moment React commits its first render", independent of auth-state resolution.

---

## Data fetching / caching

- For pages that read Amplify data, do not call `client.models.X.list()`/`.get()` directly with `useEffect`+`useState`; use **TanStack Query's `useQuery`** (the singleton in `src/lib/queryClient.ts` is already wired with `QueryClientProvider` in `main.tsx`). Reason: on route navigation the page component unmounts/remounts, and the `useEffect` approach refetches every time, causing a loading flicker whenever you switch tabs — `useQuery` solves this by reusing the cache for the `staleTime` duration.
- **Query key convention**: `[resourceName, ...identifiers]`, like `['posts', boardValue]`, `['comments', postId]`, `['diningMenu', hall, mealType]`. If multiple pages view the same data (e.g. Map also uses Schedule's schedule list), pull the key into `src/lib/queryKeys.ts` as a constant so both files reference exactly the same key — that is what lets one side reuse data the other already fetched.
- **Refresh after create/delete via `queryClient.setQueryData`** (optimistic), not by refetching with `invalidateQueries` — the response already returns the record the server created, so appending/removing it directly in the cache is faster and matches the existing UX. Follow this pattern when adding a new mutation too.
- **For imperative, non-hook code like Leaflet** (`MapPage.tsx`), use `queryClient.fetchQuery({ queryKey, queryFn })` (returns a Promise) instead of `useQuery` — the cache-reuse effect is the same. But this pattern only fits data that only needs to be read once (building list, today's library hours, etc. — a snapshot taken when the map mounts is enough); it can't capture data the map needs to react to live as another page changes it (e.g. adding/removing a class on Schedule), since that would only get picked up by unmounting and remounting the map. For that case, do what `MapPage.tsx`'s academic-building markers do: **subscribe reactively with `useQuery` at the top of the component**, then wire a `useEffect` that calls an imperative function exposed on `mapActionsRef.current` (e.g. `applyAcademicMarkers`) whenever that result changes — the imperative Leaflet code itself stays as-is, only "when to redraw" gets triggered reactively from the React side.
- **Data that must not be cached**: things that must be live (bus position polling `fetchUgaBuses`) or that are intentionally always live (library hours today `fetchLibraryHoursToday` — see the README "if the website changes..." section) should be left as-is.
- `fetchUgaBuildings()` (`ugaBuildings.ts`) is no longer a live API call — it just wraps and returns a static JSON snapshot (`src/lib/ugaBuildingsData.json`) fetched ahead of time via `pnpm data:buildings` and committed (see README "External data sources"). `fetchMapPreference()` (`mapPreferences.ts`) still uses the same module-level Promise cache it had before TanStack Query was introduced — this is already solved so it was left untouched; use TanStack Query rather than this pattern for anything new.

---

## i18n rules

- No hardcoded text — use `t('key')` from `useTranslation()` for everything.
- `en.json`/`ko.json` always keep the same key structure.
- Top-level key = page/feature unit: `nav.*`, `community.*`, `schedule.*`, `map.*`, `dining.*`, `settings.*`. Create a new key only when adding a new top-level area; when adding text to an existing page, add it under that page's existing namespace.
- Language switching is `i18n.changeLanguage('ko'|'en')` from `useTranslation()` — the `i18next-browser-languagedetector` default option `caches: ['localStorage']` means it persists across refresh with no extra save code (see the Settings page).

---

## Amplify data model (summary)

Based on `amplify/data/resource.ts`. Everything follows either `allow.owner()` (only the signed-in owner can CRUD) or, for community-style models, a "public read + owner-only write" pattern — check the file directly for the exact authorization rules.

- `Post` / `Comment` — community board
- `ClassEntry` — class schedule (course code, day, time, location)
- `MapPreference` — map personal-settings singleton (my dorm building). `src/lib/mapPreferences.ts` provides a "create if missing, reuse if present" caching wrapper.
