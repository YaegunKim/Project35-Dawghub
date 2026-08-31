# DiningPage (`/dining`)

## Purpose

Shows UGA's 6 dining halls as a card list, each card showing a preview of today's menu for the current meal (breakfast / lunch / dinner). Favorited dining halls are sorted to the top of the list.

## Data sources

- **Menu**: rather than calling [Nutrislice](https://uga.nutrislice.com) (`uga.api.nutrislice.com`) directly — CORS is blocked — the Amplify custom query `getDiningMenu` (`amplify/data/resource.ts`, handler at `amplify/data/get-dining-menu/handler.ts`) calls it server-side and proxies the result. `DiningHallCard` calls `client.queries.getDiningMenu({ hallSlug, mealType })` per dining hall (`hall`) and meal (`mealType`) — with 6 cards that is 6 independent queries (no batching/caching).
- **Hours**: there is no realtime API, so per-weekday hours are hardcoded in `src/lib/diningHours.ts` (transcribed by hand from the dining.uga.edu pages). If UGA changes hours mid-semester, a manual update is needed.
- **The 6 dining halls** (`DINING_HALLS` in `src/lib/dining.ts`, also the default card display order): `bolton`, `hillside`, `oglethorpe`, `snelling`, `niche`, `villageSummit`. Names are shown via `dining.halls.*` (i18n).

## Things to know

- **Meal type (`mealType`) is decided once, on entry**: `DiningPage` computes it once at mount via `useState(() => getCurrentMealType())` (breakfast before 10:00, lunch before 15:00, dinner otherwise). If you leave the page open across a meal boundary it is not recomputed — you have to refresh.
- **Favorites**: stored in localStorage via `useFavorites('dawghub:dining:favorites')` (not an Amplify model, unrelated to sign-in). `sortHallsByFavorite` is not a stable sort that only pulls favorites forward while keeping the rest in original order (it is a plain boolean-comparison sort).
- **Menu deduplication is not real grouping**: `station_id`/`is_section_title` are always empty in the Nutrislice response, so real station separation is impossible — the Lambda only removes duplicates by name (`seenNames`) and imitates priority by pushing condiment/beverage/dessert keywords (`SECONDARY_SECTION_KEYWORDS`) to the back. `groupMenuItemsBySection` (`src/lib/dining.ts`) just takes the order the backend already sorted and puts it into a Map grouped by section.
- **Menu preview in a card shows at most 4 items per section** (`MAX_PREVIEW_ITEMS`); overflow is shown as "+N more". The full menu is on the detail page (`/dining/:hall`, `DiningHallDetailPage`).
- **Dietary/allergen tags** (`DietaryTags.tsx`) render only tags that have a mapping in `DIETARY_ICON_URLS` / `ALLERGEN_ICON_URLS` — icon slugs from Nutrislice with no mapping (e.g. `taste-of-home`) are already filtered out at the Lambda layer.
- The map coordinates for Hillside/Niche/Village Summit are not in the official GIS and use manually researched values, but that is a map-display issue covered in `ai/pages/Map/MapPage.md` — unrelated to this list page itself.
