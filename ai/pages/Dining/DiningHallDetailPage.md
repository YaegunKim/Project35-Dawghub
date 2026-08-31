# DiningHallDetailPage

Route: `/dining/:hallSlug`

## Purpose

A detail page showing today's menu for a single dining hall (`hallSlug`), switchable by meal tab (breakfast / lunch / dinner). Each menu item is shown with dietary tags (vegan, halal, etc.) and allergen icons.

## Data sources

- **`client.queries.getDiningMenu({ hallSlug, mealType })`** — a custom query defined in `amplify/data/resource.ts`, actually implemented by the `amplify/data/get-dining-menu/handler.ts` Lambda.
  - It takes only two arguments, `hallSlug` and `mealType` — **no date argument**. Inside the Lambda it always uses today's date (UTC, from `new Date()`) to call the Nutrislice week API (`uga.api.nutrislice.com/menu/api/weeks/school/{schoolId}/menu-type/{menuTypeId}/{yyyy}/{mm}/{dd}/`) → past/future dates cannot be queried.
  - The `hallSlug` → Nutrislice `schoolId` and `mealType` → `menuTypeId` mapping tables are hardcoded inside the Lambda (`NUTRISLICE_SCHOOL_IDS` / `NUTRISLICE_MENU_TYPE_IDS`). If the set of dining halls / meals changes, start editing here.
  - The Nutrislice food-icon slug → frontend display key mapping is also inside the Lambda (`DIETARY_SLUG_MAP` / `ALLERGEN_SLUG_MAP`) — unmapped icons (e.g. `taste-of-home`) are silently dropped.
- **`getDiningHoursToday(hall)`** (`src/lib/diningHours.ts`) — a static per-weekday table transcribed by hand from the official UGA Dining site. Not an API; semester/break exceptions are not reflected → a manual update is needed when UGA changes hours (see README "External data sources" for background).
- The meal list / default selected meal (`getCurrentMealType`) and the menu grouping (`groupMenuItemsBySection`) live in `src/lib/dining.ts` (shared with DiningPage).

## Things to know

- **Limits of menu deduplication**: the Nutrislice response is a flat `menu_items` array with no section separation, so if the same name appears across multiple sections the Lambda **keeps only the first occurrence and discards the rest** (`seenNames` Set). Even if they are genuinely different dishes in different sections, only one is shown — this is a limitation of the Nutrislice data structure itself and cannot be fixed on the frontend.
- Section ordering: condiments/beverages/desserts/cereal/salad bar, etc. are always pushed behind the main-dish sections if they match `SECONDARY_SECTION_KEYWORDS` (sorted in the Lambda).
- **Favorites are not on this page**: the add/remove-favorite buttons (`dining.favoriteAdd` / `favoriteRemove` keys) are only on the list page `DiningPage` / `DiningHallCard`, and they only change sort order via the `localStorage` key `dawghub:dining:favorites` (`src/lib/useFavorites.ts`). This detail page neither reads nor writes favorite state.
- Every meal-tab switch (`mealType` change) triggers a `useEffect` that calls `getDiningMenu` again — switching tabs = a new network request, no client cache.
- The `VALID_HALLS` array is hardcoded locally inside this file and is a separate constant from `DINING_HALLS` in `src/lib/dining.ts` — when adding/removing a dining hall, both places need to be synced.
- If there is no menu or the Lambda call fails, both are handled identically as the `dining.empty` empty state (it does not distinguish an error from "no menu today").
