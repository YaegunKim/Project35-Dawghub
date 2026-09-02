# SettingsPage

## Purpose

The app-wide preferences tab. Handles account info / sign-out, language (Korean/English) switching, manual dark-mode switching, app-version display, and a bus-data-collection debug view, all in one screen.

## Data sources

- **Account info**: no data of its own — `App.tsx` passes down `user.signInDetails?.loginId` (email) and the `signOut` function received from the Amplify `Authenticator` render-prop, as the `userEmail` / `onSignOut` props.
- **Language**: `i18next`. A single call to `i18n.changeLanguage('ko'|'en')` is all there is — `i18next-browser-languagedetector` defaults to `caches: ['localStorage']`, so it persists across refresh with no extra save logic.
- **Theme**: `useTheme()` from `src/app/ThemeContext.tsx`. Stores `'system'|'light'|'dark'` under the `localStorage` key `dawghub:theme`, applied via the `<html data-theme="...">` attribute. The actual color values come from `src/design-system/GlobalStyles.tsx`, which overrides CSS variables based on the presence/value of the `data-theme` attribute.
- **Version**: `__APP_VERSION__` — the `define` in `vite.config.ts` injects `package.json`'s `version` field as a string at build time (not a runtime fetch; requires a build to update).
- **Bus data debug** (`BusDataDebugPanel.tsx`): a dev/debug view of the cumulative state of the `BusStopArrival` table that the `log-bus-arrivals` Lambda logs to every minute (see the Map page doc's "Live bus position / routes / stops") — total rows logged, number of routes/stops seen, earliest/latest sample timestamps, and a per-route row-count table. Collapsed by default and only queried once expanded (`useQuery({enabled: expanded, ...})`, so it doesn't scrape the whole table on every visit given it keeps growing), following `client.models.BusStopArrival.list()`'s `nextToken` all the way through to sum every page.

## Things to know

- **The account block at the bottom of the sidebar was removed**: previously the desktop sidebar had email + sign-out at the bottom, and the mobile bottom-tab bar had no sign-out UI at all. Now this page is the only account/sign-out surface — the `Account`/`AccountEmail`-related code was fully removed from `AppShell.tsx`, so do not bring it back.
- **Theme priority**: `system` (no attribute, follows the OS media query) → `light`/`dark` (forced override, ignores OS setting). The dark-mode media query in `GlobalStyles.tsx` is wrapped in `:root:not([data-theme='light'])` so it is never overridden even when `light` is forced — to add a new theme value, follow this file's override-block structure exactly.
- **The active-state check for the language segment** is a simple `i18n.language === 'ko' | 'en'` comparison — `supportedLngs: ['en', 'ko']` is set in `i18n/index.ts`, so even if the browser sends `ko-KR` etc., i18next normalizes it to `ko`.
- This page is one of the routes loaded via `React.lazy` (see `App.tsx`) — adding a heavy new dependency here does not affect the initial load of the other tabs.
- **Test coverage**: theme (system/light/dark → `data-theme` attribute + `dawghub:theme` localStorage) and language (`i18n.changeLanguage` → `i18nextLng` localStorage) switching are both component-tested in `SettingsPage.test.tsx`, and re-verified end-to-end (including persistence across a real page reload) in `e2e/settings-theme-language.spec.ts` — this page needs no GraphQL mocking since it makes no backend calls of its own.
