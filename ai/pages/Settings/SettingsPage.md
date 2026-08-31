# SettingsPage

## Purpose

The app-wide preferences tab. Handles account info / sign-out, language (Korean/English) switching, manual dark-mode switching, and app-version display in one screen. The only one of the 5 tabs (Community/Schedule/Map/Dining/Settings) that does not touch backend data.

## Data sources

- **Account info**: no data of its own — `App.tsx` passes down `user.signInDetails?.loginId` (email) and the `signOut` function received from the Amplify `Authenticator` render-prop, as the `userEmail` / `onSignOut` props.
- **Language**: `i18next`. A single call to `i18n.changeLanguage('ko'|'en')` is all there is — `i18next-browser-languagedetector` defaults to `caches: ['localStorage']`, so it persists across refresh with no extra save logic.
- **Theme**: `useTheme()` from `src/app/ThemeContext.tsx`. Stores `'system'|'light'|'dark'` under the `localStorage` key `dawghub:theme`, applied via the `<html data-theme="...">` attribute. The actual color values come from `src/design-system/GlobalStyles.tsx`, which overrides CSS variables based on the presence/value of the `data-theme` attribute.
- **Version**: `__APP_VERSION__` — the `define` in `vite.config.ts` injects `package.json`'s `version` field as a string at build time (not a runtime fetch; requires a build to update).

## Things to know

- **The account block at the bottom of the sidebar was removed**: previously the desktop sidebar had email + sign-out at the bottom, and the mobile bottom-tab bar had no sign-out UI at all. Now this page is the only account/sign-out surface — the `Account`/`AccountEmail`-related code was fully removed from `AppShell.tsx`, so do not bring it back.
- **Theme priority**: `system` (no attribute, follows the OS media query) → `light`/`dark` (forced override, ignores OS setting). The dark-mode media query in `GlobalStyles.tsx` is wrapped in `:root:not([data-theme='light'])` so it is never overridden even when `light` is forced — to add a new theme value, follow this file's override-block structure exactly.
- **The active-state check for the language segment** is a simple `i18n.language === 'ko' | 'en'` comparison — `supportedLngs: ['en', 'ko']` is set in `i18n/index.ts`, so even if the browser sends `ko-KR` etc., i18next normalizes it to `ko`.
- This page is one of the routes loaded via `React.lazy` (see `App.tsx`) — adding a heavy new dependency here does not affect the initial load of the other tabs.
