# DawgHub

A community board + schedule + map + dining menu app for UGA students.

## Stack

- React + TypeScript + Vite (PWA — responsive for web/tablet/mobile)
- `@emotion/styled` (per-component `*.style.ts` + `S` export pattern)
- `react-router-dom`
- `@tanstack/react-query` (server-data caching — prevents refetching on tab switches)
- `i18next` / `react-i18next` (en, ko)
- Backend: AWS Amplify Gen2 (Cognito Auth + AppSync/GraphQL + DynamoDB)

## Structure

```
src/
  app/            # Routing (React.lazy code splitting) + AppShell (responsive layout: desktop sidebar / mobile bottom tabs) + ThemeContext (dark mode)
  design-system/  # Reusable building blocks (Page, Card, Button, Input, Textarea, Select, IconButton, EmptyState, Skeleton, BackLink, Brand/Logo) + colors/typography/spacing/radius/shadow/motion tokens
  pages/          # community / schedule / map / dining / settings — composed from design-system components
  lib/            # Amplify data client, Passio (bus) API client
  i18n/           # Translation resources
amplify/
  auth/           # Cognito (email sign-in, @uga.edu domain-restricted pre-signup Lambda)
  data/           # AppSync/DynamoDB schema (Post, Comment, ClassEntry, MapPreference) + getDiningMenu custom query (Lambda)
  backend.ts
```

## Design system

Pages are composed from the building blocks in `src/design-system/`:

- **Page / PageTitle** — the common layout for every page (max-width 720px, vertical flex) and the title
- **Card / CardLink** — card-style surfaces. Per-page domain components (`BoardCard`, `PostCard`, `EntryCard`, etc.) extend it with `styled(Card)`
- **Input / Textarea / Select** — form-field primitives
- **Button / IconButton** — button (with variants) / icon-only button
- **EmptyState** — empty-state copy (loading is being replaced by Skeleton below)
- **Skeleton** — a shimmer block that imitates the real layout (card/line widths) while loading
- **BackLink** — a "← Back" link

Pure style components with no logic re-export `S.Component` from `Component.style.ts` as-is; only ones that need logic (Button's variants, IconButton's default type) are thinly wrapped in `.tsx`. As a rule, visual patterns that repeat across pages are moved here rather than left in the pages.

## Brand / design system

- **Logo**: `public/brand/logo.svg` is the source — an original mark drawn with UGA brand colors (`#BA0C2F` red + black) and a bulldog motif (it does not use UGA's official "Power G"/mascot directly, to avoid trademark risk). `src/design-system/Brand/Logo.tsx` is the in-app React version.
- **PWA icons**: `@vite-pwa/assets-generator` (`pwa-assets.config.ts`) auto-generates favicon/apple-touch/PWA 64·192·512·maskable-512 (brand-red background + 30% safe-zone padding) entirely from `public/brand/logo.svg`. When you change the logo, regenerate with `pnpm assets:icons`.
- **OG share image**: `public/brand/og-source.svg` → `pnpm assets:og` (`scripts/generate-og-image.mjs`, sharp) generates `public/og-image.png` (1200x630). `og:*`/`twitter:*` meta tags are registered in `index.html`.
- **Color/typography tokens**: `src/design-system/colors.ts` (brand/surface/state/category), `src/design-system/typography.ts` (fontFamily.body/display, size, weight). Emphasis text such as page titles uses Google Fonts `Oswald` (`--font-display`).
- **spacing/radius/shadow/motion tokens**: `src/design-system/{spacing,radius,shadow,motion}.ts` — 4px-grid spacing, a radius scale (sm/md/lg/pill), subtle elevation, and transition duration/easing. Applied to `Card`/`Button`/`IconButton`.
- **Manual dark-mode switching**: `useTheme()` from `src/app/ThemeContext.tsx` — choose system/light/dark in the Settings tab, persisted to `localStorage`, applied via the `<html data-theme>` attribute.
- **Responsive**: `AppShell` has a two-step breakpoint at 768px (mobile bottom tabs ↔ sidebar) and 1024px (tablet compact ↔ desktop full sidebar); the `Page` component expands max-width from 720px to 960px at 1024px.

## External data sources (unofficial APIs)

- **Live bus position**: [Passio GO](https://uga.passiogo.com) — UGA system id `3994`. CORS is open, so the frontend (`src/lib/passio.ts`) polls it directly every 15 seconds. Bus routes (polylines) and stops also come from the same API's `getStops` response (`routePoints`, `stops`).
- **Dining menu**: [Nutrislice](https://uga.nutrislice.com) (`uga.api.nutrislice.com`) — CORS is blocked, so an Amplify Lambda (`amplify/data/get-dining-menu`) calls it from the server instead.
- **Building locations (libraries/dining halls/gyms/housing/academic buildings)**: a public ArcGIS service run by UGA's Office of University Architects (OUA) — `maps.itos.uga.edu/arcgis/rest/services/OUA/UGA_CampusMap_Base/MapServer/7`. It provides building name + exact coordinates + a `BuildingUse` field. The building list doesn't change term to term, so instead of a live query every session, it's fetched once via **`pnpm data:buildings`** (`scripts/fetch-uga-buildings.mjs`) and committed as a static JSON snapshot (`src/lib/ugaBuildingsData.json`) — the app only ever reads that JSON (`src/lib/ugaBuildings.ts`). Only re-run and commit the script when campus construction actually changes the building list. 3 buildings missing from the GIS layer entirely (Hillside, The Niche, Village Summit dining halls) are still hand-hardcoded in `MANUAL_BUILDINGS`.
- **Library hours (live)**: UGA Libraries use Springshare **LibCal** (`api3.libcal.com/widget/hours/grid?iid=4280&lid=0`). Each library's individual `/hours` page (e.g. `libs.uga.edu/main/hours`) is just this same system embedded with a different `lid` — so a single grid request covers 9 locations (Main / McBay Science / Carnegie / Miller Learning Center / Special Collections / Lamar Dodd Art Library / Hugh Hodgson Music Library / Aderhold Curriculum Materials Library + the Law Library Annex, which is not in this system so only its name is shown). CORS is open and it returns the actual schedule for today's date — `src/lib/libraryHours.ts` queries it live every time (no cache, so if UGA changes hours it is reflected immediately).
- **Gym hours**: [UGA Rec Sports](https://recsports.uga.edu) only publishes a hand-made PDF calendar each semester (no API/feed, and the URL changes each semester). The Fall 2026 PDF was parsed by hand and hardcoded into `src/lib/gymHours.ts` as regular hours + exception days (closed for home games, Thanksgiving/winter break, etc.) — **it must be updated manually next semester from the new PDF**. Shown as two facilities: Ramsey Center and Pound Hall & Wheeler Gym (HSC campus, two buildings that are one facility).

None of these are APIs that UGA officially documents "for third-party developers" (they just use the endpoints that each service's own web/app uses), so they can change or break without notice — if something goes wrong, check here first.

### "If the website changes, is it detected and reflected automatically?"

The answer differs per data source:

- **Libraries**: no detection is needed — the LibCal API is queried live every time, so it reflects the moment UGA changes hours.
- **Bus / dining / building locations**: likewise live-queried every time (or once per session after caching), so they follow the source naturally when it changes.
- **Gyms**: the genuinely problematic case. There is no webhook or RSS from UGA that says "this page/PDF changed." The best you can do is a **periodic re-check batch job** (e.g. an Amplify Lambda on a daily EventBridge schedule that re-fetches the PDF, compares a content hash, and updates the DB if it changed) — not a true "instant trigger." On top of that, the PDF URL itself changes each semester (`RAMFALL26` → `RAMSPRING27`), so it is impossible to predict and auto-navigate to the new URL — ultimately a person has to provide the new PDF link at the start of each semester. Right now the current semester's schedule (Fall 2026) is parsed by hand and hardcoded, and no auto-refresh was built.

### Schedule ↔ Map integration

If you enter a UGA building name into `ClassEntry.location` (a datalist of real building names is offered for autocomplete on entry), the Map page shows it as a 🎓 marker at that building's coordinates. However, **there is no public API for UGA's actual per-class room assignment data** (Athena needs SSO login, and the old public Banner 8 endpoint is currently broken) — so the room/building must be entered by the user, and the app matches that text against UGA's official building data to attach the exact coordinates.

## Getting started

```bash
pnpm install
pnpm dev
```

## Backend (Amplify Gen2)

```bash
pnpm sandbox   # deploy a local-dev AWS sandbox (generates amplify_outputs.json)
```

Requires valid AWS credentials — run after registering an access key via `aws configure` or one issued from an AWS Educate account. After `amplify_outputs.json` is generated, the frontend will be connected via `Amplify.configure(outputs)`.

## TODO

- [x] Frontend skeleton (routing/layout/i18n/PWA)
- [x] Amplify Gen2 backend scaffolding (auth, data schema)
- [x] AWS account connected + first deploy via `pnpm sandbox`
- [x] Wire `Amplify.configure` into the frontend + sign-in flow (Authenticator, brand colors applied)
- [x] Wire community post creation/read to the real backend (per-board list + create form)
- [x] Wire the schedule screen to the ClassEntry model (grouped by day, add/delete)
- [x] Basic map screen (Leaflet + OpenStreetMap, centered on UGA campus)
- [x] Restrict sign-up to `@uga.edu` email domain (Cognito Pre-signup Lambda, server-side validation)
- [x] Wire comment CRUD (post detail page)
- [x] Live bus position layer (Passio GO, 8s polling + heading arrow + smooth move animation)
- [x] Dining menu data source (Nutrislice, Lambda proxy)
- [x] Deduplicate dining menu items (the Nutrislice response has no section/station data — real grouping is impossible, `station_id`/`is_section_title` are always empty)
- [x] Bus route (real path polyline) + stops layer (using `routePoints`/`stops` from the Passio `getStops` response)
- [x] Add PWA icons (192/512/maskable/apple-touch/favicon, brand-color "D" monogram)
- [x] Design-system cleanup (refactored pages broadly onto Page/Card/Input/Textarea/Select/IconButton/EmptyState/BackLink)
- [x] Switch map tiles to CARTO Voyager (cleaner style)
- [x] Full-bleed map — remove AppShell padding on the Map tab
- [x] Library/dining/gym map markers (UGA official ArcGIS building data, per-category icons)
- [x] Schedule location ↔ map integration (building-name datalist autocomplete + coordinate matching, 🎓 marker)
- [x] Map legend overlay (icon key for bus/library/dining/gym/my classes) — click to toggle that layer on/off
- [x] Replace library/gym/dining markers with FontAwesome icons (book-open-reader / dumbbell / utensils)
- [x] Bus polling 8s + heading arrow + smooth marker move animation
- [x] Remove the "Map" badge at the top of the map
- [x] Change how map markers respond to zoom — instead of continuously scaling, use a fixed-size icon at/above a base zoom (15) and simplify to a small dot when zoomed out below that (the usual approach in real map apps)
- [x] Keep reusing the existing 0.6–1.6x clamp values for the zoom-scale (%) label (60%–160%, independent of the icon display method)
- [x] Keep the map legend always on one line (`flex-wrap: nowrap` + horizontal scroll, does not wrap to two lines on narrow screens)
- [x] Library live hours (LibCal API live query) — shown in the map popup as "Today: 7:30am – 2am"
- [x] Gym hours (Ramsey Center + Pound Hall/Wheeler Gym) — parsed from the Fall 2026 PDF and hardcoded, with regular hours + exception days
- [x] Fix duplicate gym markers — Pound Hall and Wheeler Hall are separate buildings but one facility ("Pound Hall & Wheeler Gym"), so unified to a single marker
- [x] Expand library markers from 3 to 9 (added Miller Learning Center, Special Collections, Lamar Dodd Art Library, Hugh Hodgson Music Library, Aderhold Curriculum Materials Library — all covered, including hours, by the single LibCal grid)
- [x] Rearrange map UI — remove the bottom-left caption badge, move the zoom control to bottom-right + show zoom scale (%) next to it (base zoom 15 = 100%), change the legend from a top-right box to a horizontal bar at the very top
- [ ] Gym schedule needs a manual update each semester (auto-detection is impossible — see the README "if the website changes..." section)
- [x] Add map markers for 3 dining halls (Hillside/The Niche/Village Summit) — not in the GIS, so coordinates were researched directly and hardcoded into `MANUAL_BUILDINGS` in `src/lib/ugaBuildings.ts` (Hillside/Niche are approximate, Village Summit matches the Joe Frank Harris Commons building exactly). Dining hours were checked directly from [dining.uga.edu](https://dining.uga.edu/locations/dining-commons/) and all 6 locations reflected in `src/lib/diningHours.ts` (cross-checked against the actual page)
- [x] Fix building-search bug — the GIS data had 51 buildings with a blank (`" "`) name, and the fallback matching in `findBuildingByName` was landing on one of them, so nonexistent building names (manually registered dining halls, etc.) were all incorrectly matching that blank-name building — fixed by trimming names and filtering out empty strings in `fetchUgaBuildings`
- [x] Replace map marker popups with real React components — changed to box-style components showing name / today's hours (libraries·gyms) and name / today's hours / today's menu (dining halls, reusing the `DiningHallCard` style). React trees are mounted into the Leaflet popup with `createRoot`, and a `ResizeObserver` auto-updates the popup size on async menu loading (`src/pages/map/reactPopup.tsx`, `src/pages/map/popups/`)
- [x] Remove the fixed center "University of Georgia" map marker (it was an off-style old default pin)
- [x] Show my location (GPS) — toggled by the bottom-left 📍 button, real-time tracking via `navigator.geolocation.watchPosition` + an accuracy circle. Facing direction is obtained via `DeviceOrientationEvent` (iOS `webkitCompassHeading`, Android `alpha` of `deviceorientationabsolute`) and shown as a cone over the blue dot; when stationary with no compass, it falls back to GPS `coords.heading` (direction of travel). iOS compass permission is requested at the moment of the button click (user gesture)
- [x] Show the campus boundary — polygon coordinates fetched from OpenStreetMap relation 21071510 (University of Georgia, ODbL), stored statically in `src/lib/campusBoundary.ts`, overlaid on the map as a red dashed line (near-static data, so it is baked into the build rather than fetched every time)
- [x] Show dorm/academic-building locations as dots — filtered by the `BuildingUse` field (`Housing`/`Academics`) of the UGA ArcGIS building layer and all shown via `L.circleMarker` (64 dorms, 318 academic buildings). Individually toggleable in the legend
- [x] Shrink the dorm/academic dots — 2px-radius grey dots, only really visible when zoomed in and just there to click and select
- [x] "My dorm" setting — settable/clearable from the popup when clicking a dorm dot, saved to the `MapPreference` Amplify model (owner-scoped) so it syncs across devices per account. When set, that dot alone is highlighted large in orange
- [x] "My academic buildings" auto-highlight — clicking an academic dot shows the list of my classes in that building (matching `ClassEntry.location` on the schedule). The separate "my classes" (🎓) layer and manual checklist were removed; if a building is on my schedule, the academic dot is automatically (no checkbox) highlighted large in purple — unified into one layer
- [ ] Per-class room/time cannot be auto-looked-up (UGA Athena needs SSO login, no alternative public endpoint) — the current user-entry approach is the best option
- [x] Brand refresh — replaced the placeholder "D" monogram with an original logo (UGA colors + bulldog motif), built the PWA icon auto-generation pipeline with `@vite-pwa/assets-generator`, added the OG share image (1200x630) + `og:*`/`twitter:*` meta tags
- [x] Design-system tokenization — new `src/design-system/colors.ts` (brand/surface/state/category) / `typography.ts`, replaced the magic hex colors scattered across map·schedule with token references. Applied Google Fonts `Oswald` (`--font-display`) to emphasis text like page titles
- [x] Responsive expansion — added a tablet compact sidebar tier to `AppShell` (768–1024px, icons only), expanded the `Page` component max-width to 960px above 1024px, switched the dining card sections to a grid instead of horizontal scroll on desktop (1024px+), added a max-width to map popups to prevent overflow on narrow screens
- [x] Built a dev-docs harness — root `CLAUDE.md` (stack/conventions/style rules) + per-page `ai/pages/<Tab>/<Page>.md` detail docs (data sources, known quirks)
- [x] New Settings tab — added as the 5th tab, with account (email/sign-out), preferences (language Ko/En, dark mode system/light/dark manual switching), and app info (logo/version). Sign-out, which was only at the bottom of the sidebar, was consolidated here — this also fixed the problem that the mobile bottom-tab bar had no sign-out UI
- [x] Manual dark-mode switching — persisted to `localStorage` via `ThemeContext` (`src/app/ThemeContext.tsx`), based on the `<html data-theme>` attribute. Can force light/dark regardless of the OS setting; defaults to following the system setting
- [x] Design-token expansion — new `spacing.ts`/`radius.ts`/`shadow.ts`/`motion.ts` (referencing the Toss and Daangn design systems), applied to the shared `Card`/`Button`/`IconButton` components to unify elevation and transitions
- [x] Navigation redesign — replaced the emoji icons with FontAwesome, applied a pill background highlight to the active tab
- [x] Skeleton loading — new `Skeleton` shimmer component, replaced the "Loading..." text in the post list / post detail / dining menu preview·detail with skeletons that imitate the real layout
- [x] Splash screen — added a logo-pulse-animation splash to `index.html`, fading out at least 500ms after React's first render
- [x] Performance optimization — route-level `React.lazy` code splitting + separate `leaflet`/`amplify`/`fontawesome` vendor chunks, splitting the single 1.36MB bundle into several cacheable chunks (Amplify itself is still large so the chunk warning remains — it is needed for auth and cannot be lazy-loaded)
- [x] Fixed the problem where everything refetched on every tab switch — introduced TanStack Query (`src/lib/queryClient.ts`), converted the post list / post detail / dining menu / schedule to `useQuery` so switching tabs immediately reuses cached data (no loading flicker). Pages that view the same data (like Schedule's schedule list, also used by Map) share a query key (`src/lib/queryKeys.ts`) so the cache is shared too. Data that must be live (bus position) or is intentionally always live (library hours) is still not cached
- [x] Re-verified the desktop/wide-screen UI — while fixing a bug where the schedule calendar covered the sidebar (a `width:100vw` breakout hook), the calendar had narrowed to 960px like other pages; changed it to use its own unconstrained `S.Root` instead of the shared `Page` so it again uses the full width minus the sidebar (no text clipping even at 1920px). "Add a class"/"Search classes" were also unified to the same centered modal as the detail view, replacing the inline/drawer approach that stretched awkwardly on desktop. Community/Dining/Settings/post detail keeping a centered narrow column on wide screens is the intended design (for readability, not a bug), so those were left as-is
- [x] Redesigned the top map legend as chips — unified to FontAwesome icons instead of emoji, active/inactive state shown with a colored border + tinted background. The abrupt cut-off at the horizontal-scroll edges was solved with a fade mask, and the bug where `justify-content: center` hid the first item (Bus) off-screen on overflowing content was solved with `safe center`
- [x] Removed the fixed top bar — since the Map's fixed top legend bar was inconsistent with other tabs (where only the title scrolls), decided to have no fixed top bar anywhere in the app. The Map's category toggles were replaced with a Google-Maps-style top-right circular "Layers" button + a popover panel that appears on click (chips wrap inside the panel, no more horizontal scroll needed)
- [x] Expanded the map layer panel into a drawer + per-category settings modals — pressing the "Layers" button opens a drawer that slides in from the right, and pressing each category row opens a dedicated modal. Bus has 3 modes (running routes only / all routes / pick manually via a checklist); library·dining·gym are a checklist of which buildings to show; academics is a checklist of which of the candidate buildings matched to my schedule to actually show. Housing lets you designate my dorm via a search input, shown as a house (🏠) marker instead of a dot (sharing the same field as the existing click-the-dot-on-the-map method). Where settings are stored is split by nature — frequently-changing display settings (bus/library/dining/gym) go to `localStorage` (no GraphQL mutation load), while low-frequency settings that should travel with the account (my dorm / my academic buildings) still use the existing `MapPreference` Amplify model (no new field/migration needed; `myAcademicBuildings` revives a previously dead field)
- [x] Bus stops now follow the route filter too — confirmed that each stop entry in the Passio `getStops` response actually carries a `routeId`/`routeName` (`PassioStop.routeName` in `src/lib/passio.ts`), so choosing a route filter (running / all / pick manually) now toggles the matching stops on and off along with it — previously only the route polylines and live buses were filtered and all stops were always shown
- [x] Per-meal hours subtitle on the dining detail page meal tabs — shows today's hours for that meal, small, under the breakfast/lunch/dinner tab buttons. The `dining.uga.edu` combined list page has no per-meal times, so the 6 dining halls' individual pages (`/location/<hall>-dining-commons/`) were re-checked and added to `src/lib/diningHours.ts` as `DINING_MEAL_HOURS` (cross-checked that the sums match the existing all-day hours table)
- [x] Pinnable menu sections — pinning a section with the pin icon next to its title on the detail page sorts it to the top (`sortSectionsByPinned`, `src/lib/dining.ts`). Stored globally by section name (`localStorage` key `dawghub:dining:pinnedSections`, reusing the same `useFavorites` pattern as dining-hall favorites), so once pinned that section name floats up everywhere. The home list card previews (`DiningHallCard`) share the same key and reflect the order (the pin button itself is only on the detail page)
- [x] Pin indicator in the dining tab card previews too — added a small pin icon next to pinned section titles (read-only, not clickable) so it's visible at a glance which sections are pinned, not just reflected in the order
- [x] Meal-hours next to the meal label on the dining list cards — next to a red label like "Dinner", show that meal's hours today in small grey text (reuses `getDiningMealHoursToday`, same data as the detail page meal tabs)
- [x] Dietary/allergen icon legend modal on the dining tab — a gear button next to the title opens a modal showing the 5 dietary and 9 allergen types as icon + name (evolved over later commits from a simple show/hide checkbox → 3-state show/only/exclude → finally 2-state show/hide)
- [x] Filter the menu itself by dietary/allergen tags (show/hide) — a per-tag 2-way segment (pill-shaped, side by side in one row, directly clickable) picks tags to hide, dropping items that have them; multiple hidden tags combine as OR. `filterItemsByTagState` (`src/lib/dining.ts`) filters the item array before section grouping, so it applies to both the list cards and the detail page; state is stored in `localStorage` (`dawghub:dining:tagFilters`). An "only" (AND, keep just items with the tag) option existed at first, but Nutrislice often doesn't tag obviously safe items (orange juice, etc.), so a "halal = only" filter would also drop untagged items and mislead — removed, as it's a limitation of the tagging data. When everything is filtered out, a `dining.noMatch` message distinct from "no menu" is shown; the modal has a reset-all button
- [x] Apply the dining tag filter instantly — replaced `useTagFilters`' per-component `useState` with a module-level external store (`useSyncExternalStore`). With the settings modal and all 6 cards mounted on the same page at once, toggling in the modal didn't update the cards because each held its mount-time value — now every subscribed component re-renders the moment it changes, wherever the change came from
- [x] Smooth transition when the dining tag filter changes — the filter buttons change instantly, but the menu list (previously "teleporting" since it's a synchronous computation) now briefly shows a 300ms loading skeleton via `useTransitionFlash` (`src/lib/useTransitionFlash.ts`, a general-purpose hook) before settling on the new result (both the list cards and the detail page)
- [x] Show the next opening time when a dining hall is currently closed — `isDiningHallOpenNow` / `getNextDiningOpen` (`src/lib/diningHours.ts`) decide by combining the all-day hours table and the per-meal hours table (`allRangesForDay`). The per-meal data alone misses Hillside's late night (10pm–2am); the all-day table alone misses Niche's dinner (5–7pm, only a parenthetical note there) and the lunch-to-dinner gap (2:30–5pm), so both are required. Ranges crossing midnight add 24h to the end time; scans up to 7 days ahead and shows "Opens today/tomorrow/{{day}} at H:MMam/pm" (day label reuses the schedule page's `schedule.days.*` i18n)
- [x] Dining tab card UI polish — swapped the favorite star from a text glyph (★/☆) to the FontAwesome `faStar` icon, turned the meal + time row into a pill-shaped chip, added a category-colored dot next to section titles, made card shadow/corners more pronounced (`shadow.md`/`radius.lg`)
- [x] Today's date badge to the right of the Dining tab title — a 📅 emoji + date/weekday shown as a white pill badge on the same line as the title (always a white background even in dark mode, a deliberate fixed color). Month/day formatted per-locale via `Intl.DateTimeFormat`, weekday reuses the Schedule page's `schedule.days.*` i18n. This app has no fixed top bar, so it's just a badge next to the Dining tab's `PageTitle`, not present on other tabs
- [x] Open/Closed badge on dining hall cards — a green/red dot + text pill badge, reusing the existing `isDiningHallOpenNow` check. Designed per general badge UI guidelines (pair color with a dot + text, pill shape). Fixed at the top-right of the card, directly left of the favorite star, regardless of dining hall name length
- [x] Changed the dining hall card's menu preview to an expand/collapse accordion — defaults to collapsed so the list doesn't get too long, expanded via a "Show/Hide menu" toggle at the bottom of the card (chevron icon rotates). The whole card still navigates to the detail page on click; only the toggle button calls `stopPropagation`. The expand animation uses the `grid-template-rows: 0fr↔1fr` CSS trick, no JS height measurement needed
- [x] Sort the dining tab card preview's sections by item count, most first — applies `sortSectionsByItemCount` (`src/lib/dining.ts`) before the pin sort (stable sort combines as pinned-first, then most-items-first). Not applied on the detail page, which keeps the backend's original order (mains first) — this sort order was explicitly requested for the card preview only
- [x] "See Location"/"Get Directions" buttons on dining cards and the detail page — `DiningQuickActions` resolves the dining hall's building coordinates and navigates to the Map tab with a `mapIntent` (`focus` zooms in on the location with a ripple animation, `directions` opens the trip-planning panel with the destination pre-filled and the origin auto-filled from GPS as soon as a fix is available)
- [x] Disabled pinch-zoom/browser zoom across the whole app — viewport meta `user-scalable=no` plus `touch-action: manipulation` as a fallback for iOS Safari's double-tap zoom
- [x] Convention cleanup pass — expanded `shadow.ts` from 2 to 12 elevation tiers (resting/hover/floating/card/fab/lg/modal/drawerRight/sheetUp/knob/tabActive, on top of sm/md) and migrated ~25 inline `box-shadow: rgba(...)` values across Schedule/Map/Dining/Friends styles onto them; converted the Schedule/Friend-schedule grid's remaining `style={{...}}` position/color usages onto `$`-prop styled components (CLAUDE.md's "no inline styles" rule had a gap here since the grid predates that convention); removed one dead export (`getDiningHoursTodayByBuildingName`)
- [x] Added a real testing setup from scratch — Vitest + React Testing Library for unit/component tests (`pnpm test`), Playwright for E2E (`pnpm test:e2e`), replacing the old pattern of a disposable `src/devharness/` + Playwright harness created and deleted for each manual verification round. `src/test/renderWithProviders.tsx` is the permanent harness (Router + isolated QueryClient) for component tests; `e2e/fixtures/mockGraphQL.ts`/`geolocation.ts` mock the network boundary and GPS timing for E2E instead of hitting the real deployed backend or Chromium's (here, unusable) built-in geolocation mock. Discovered along the way: `allow.owner()`/`allow.authenticated()` Amplify models can't be exercised through E2E's network-boundary mocking at all (the client throws before any request is even made without a real signed-in Cognito session) — those flows (e.g. the Schedule grid) are covered as Vitest component tests that mock the Amplify client module directly instead. See CLAUDE.md's Testing section
