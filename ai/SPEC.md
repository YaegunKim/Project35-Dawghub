# DawgHub — Community Boards Functional Spec

**Status:** Draft v1
**Last updated:** 2026-09-10
**Related docs:** [`PRD.md`](./PRD.md) (why), [`TRD.md`](./TRD.md) (how, data model, integration matrix), current as-built docs: [`ai/pages/Community/CommunityPage.md`](./pages/Community/CommunityPage.md), [`BoardPage.md`](./pages/Community/BoardPage.md), [`PostDetailPage.md`](./pages/Community/PostDetailPage.md)

This is the build-ready spec for the five Community boards. Follow `CLAUDE.md`'s style rules throughout (no inline styles, `S.Name` styled-component pattern, design tokens, i18n for all text, no fixed top bar). New i18n keys go under the existing `community.*` namespace (add `community.general.*`, `community.housing.*`, `community.classes.*`, `community.buySell.*`, `community.events.*` sub-namespaces, mirrored identically in `ko.json`/`en.json` per `CLAUDE.md`'s i18n rules).

## 1. General

### 1.1 Category filter

- `BoardPage` for `general` gains a `SegmentedControl` (design-system component, already exists) above the post list: All / Notice / Free talk / Q&A / Timetable (`community.general.category.*`).
- Post composer gains the same segmented control to pick `category` at creation time; default `FREE_TALK`.
- `NOTICE` posts are visually distinguished in the list (a small `Badge` component, `state`-token color) but **anyone can post one in phase 1** — there is no admin-only posting restriction yet (explicitly deferred; flag if this needs to change before launch).

### 1.2 Anonymous per-thread labeling

- Post list and detail view never render a real name/email (already true today by omission — this makes it explicit and permanent).
- The **post author** is always labeled "익명" / "Anonymous" (no number — there's only one author per post).
- Each **distinct commenter** on a thread gets a stable ordinal the first time they comment on that thread: "익명1", "익명2", ... The post author, if they comment on their own post, is also assigned into this same numbering the first time they do (not treated specially).
- Numbering is per-thread, not global — the same user is "익명1" on one post and "익명3" on another.
- See `TRD.md` §4.5 for how this is computed; the frontend just renders whatever `anonNumber` (or resolver-computed label) comes back — it must never attempt to derive or guess this from `owner` client-side.

### 1.3 Like / scrap

- `Post` gains a like button (heart or thumbs icon, FontAwesome per existing convention) showing `likeCount`; tapping increments once per user (needs a `PostLike` join model — `postId` + owner, unique per pair — or a Lambda-guarded increment; do not just let the client PATCH `likeCount` directly, which would let a user like a post repeatedly by spamming the button before the UI disables it).
- "Scrap" (bookmark) is a **local, per-user, non-social** action — reuse the existing `useFavorites` hook pattern (already used for dining-hall favorites) rather than a new backend model; a "Saved posts" view lives under Settings or a small icon on `CommunityPage`.

### 1.4 Edge cases

- Empty category filter (no posts in that category) reuses the existing `EmptyState` pattern, not a new one.
- A `NOTICE` post still goes through the same create/read/comment path as any other post — only its badge and (optionally) sort-to-top behavior differ.

## 2. Housing

### 2.1 Layout

`BoardPage` for `housing` gains, above the existing post list, a non-scrolling action row (two buttons, not a fixed bar — scrolls with content per `CLAUDE.md`'s "no fixed top bar" rule):

- **"Open UGA Housing ↗"** → `window.open('https://housing.uga.edu', '_blank', 'noopener,noreferrer')`
- **"Open my StarRez portal ↗"** → `window.open('https://uga.starrezhousing.com/StarRezPortalX/Login', '_blank', 'noopener,noreferrer')`

Both are plain external links with an external-link icon (FontAwesome `faArrowUpRightFromSquare` or similar), never an iframe (`TRD.md` §2.1). Label copy should make explicit these leave the app and go to UGA's real site — this is a trust signal, not just a UX nicety, given §2.1's phishing-adjacent concern: users should never be confused about whether they're entering credentials into DawgHub or into UGA's own site.

### 2.2 Post composer subtype

- A `SegmentedControl`: Discussion / Dorm review / Sublease or roommate search (`community.housing.type.*`). Default: Discussion (existing free-form behavior, unchanged).
- **Dorm review**: adds a required `dormBuilding` field — an `<input list>` datalist autocomplete against `fetchUgaBuildings()` filtered to `BuildingUse === 'Housing'` (same 64-building set already surfaced on the Map tab's dorm layer). Reject free text that doesn't match a real building name (same validation spirit as how Map/Schedule already treat building names as a controlled vocabulary).
- **Sublease/roommate search**: adds `dormBuilding` (same autocomplete) + two date fields (move-in/move-out) + a monthly-rent number field. These render as extra fields in the existing composer form, not a separate screen.

### 2.3 List display

- A `DORM_REVIEW` or `SUBLEASE`/`ROOMMATE_SEARCH` post shows its `dormBuilding` as a small chip on the list card (reuse the `Badge` component).
- No filter-by-building in phase 1 (small dataset; add if the board grows).

### 2.4 Edge cases

- If `fetchUgaBuildings()` is slow/unavailable, degrade the dorm-building field to plain free text rather than blocking posting entirely (matches the general principle elsewhere in this app of graceful degradation over hard failure — see how Map handles a missing building match).

## 3. Classes

### 3.1 Course-code attachment

- Post composer gets an optional "Attach a course" field: typing triggers the same lookup `searchUgaClasses` already powers on the Schedule tab (reuse the query/hook, don't reimplement), showing course-code + title suggestions; picking one stores `courseCode` on the post and renders it as a chip in the composer (removable).
- Posting without a course code attached remains fully supported (plain discussion post) — this is additive, not required.

### 3.2 Course lookup panel

- Tapping a course-code chip (in the composer or on an existing post) opens a modal (reuse the existing `ModalBackdrop` + centered-card pattern from Schedule, per `CLAUDE.md`'s established convention for this exact kind of detail popup) showing:
  - Current-term sections for that course (from `searchUgaClasses`, filtered by course code) — instructor, meeting time, building/room.
  - Each instructor's RMP rating badge, reusing the existing `getProfessorRating` flow verbatim (same badge component/behavior as Schedule's search results) — tapping it lazily loads `getProfessorReviews`, unchanged.
  - The catalog description block from the new `getCourseCatalogEntry` query (`TRD.md` §4.4): credit hours, prerequisites, full description text.
- This modal is a **read-only lookup**, not an "add to my schedule" flow — that action still only exists on the Schedule tab (per PRD §6.3 AC4, don't duplicate it here). If a user wants to add the class, the modal can offer a "Go to Schedule" link that navigates to `/schedule` (no state hand-off needed beyond that; searching there again is an acceptable one-extra-tap cost for phase 1).

### 3.3 Board filter

- `BoardPage` for `classes` gets a course-code search/filter box (client-side substring match against attached `courseCode`s on already-loaded posts — no new backend query needed given current unpaginated post-list scale, matching `BoardPage.md`'s documented "no sorting or pagination yet" reality; revisit if that changes).

### 3.4 Edge cases

- A course code that no longer exists in the current term's `searchUgaClasses` results (e.g. an old post about a class not offered this semester) should still render its chip and open the catalog-description half of the modal even when the sections list comes back empty — don't let a missing current-term section suppress the whole panel.
- Catalog lookup failure (bad course code format, `bulletin.uga.edu` unreachable) shows an inline error in the modal, not a full-page failure — the rest of the post/thread must stay usable.

## 4. Buy & Sell

### 4.1 List view (`/community/buySell`)

- Replaces the generic `Post` list with a `MarketplaceListing` grid/list (responsive: single column mobile, grid ≥1024px per `CLAUDE.md`'s breakpoint convention).
- Each card: primary photo (or a placeholder icon if none), title, price, category badge, condition, "Sold" ribbon overlay when `status === 'SOLD'`.
- Default view excludes `SOLD` listings; a toggle ("Show sold too") reveals them. `RESERVED` listings show a distinct badge but remain visible by default (still technically available pending the reserved buyer).
- Category filter: `SegmentedControl` or a horizontally-scrolling chip row (reuse the pattern already established for Map's category toggles/Dining's dietary filters — a horizontal-scroll chip row with a fade mask, per the existing convention).

### 4.2 Create listing

- Form fields: title, description (Textarea), price (numeric input, validated > 0), category (Select), condition (Select), photos (up to a fixed max, e.g. 6 — file input triggers client-side downscale per `TRD.md` §4.3 before upload to the new Storage bucket).
- On submit: upload photos first (show per-photo upload progress or a single aggregate spinner via `Button`'s existing `loading` state pattern), then create the `MarketplaceListing` record with the resulting `photoKeys`. If photo upload fails partway, do not create a listing with a partial/broken photo set — surface a danger toast (`community.buySell.uploadFailed`) and let the user retry the whole submission, matching the existing "form only clears on success" convention from `BoardPage.md`.

### 4.3 Listing detail

- Photo carousel (swipe/arrow, simple — no new dependency needed for a handful of images), full description, price, category/condition, seller controls (owner-only): mark Reserved/Sold/Active, edit, delete.
- **"Contact seller" button** (non-owner view only): on tap, reveals `sellerEmail` as a `mailto:` link with a pre-filled subject line referencing the listing title — not shown anywhere before this explicit tap (list view and the top of the detail view never show it eagerly). This is the full extent of "contact" in phase 1 — no in-app messaging (`PRD.md` §3 non-goals).

### 4.4 Edge cases

- Marking a listing `SOLD` should be undoable (reuse the optimistic-update + undo-toast pattern already established for Schedule's class deletion, `SchedulePage.md` — same UX language across the app for "soft, reversible destructive-ish actions").
- A listing with zero photos is valid (some items, e.g. a textbook by ISBN, don't need a picture) — never block submission on missing photos, only on missing title/price/category.

## 5. Events

### 5.1 List view

- Above the post list: a small, non-interactive reference strip showing the next 1–2 upcoming academic-calendar milestones (from the manual snapshot, `TRD.md` §3 row "UGA academic calendar") — e.g. "Fall break: Oct 12–13". Not a full calendar UI in phase 1, just a glance-able strip.
- A **"🍕 Free food" filter chip** sits first/most-prominent among the tag filter chips (reuse the horizontal chip-row pattern from §4.1), reflecting how explicitly this was called out as a wanted use case — don't bury it as just another value in a generic tag dropdown.
- Each event card shows: title, date/time (formatted via `Intl.DateTimeFormat`, same convention as Dining's date badge), location chip, tag badges, and an external-link icon if `externalLink` is set.
- Past events (eventDate < today) are hidden from the default view by default, with a toggle to show them (mirrors "hide sold" in Buy & Sell — consistent pattern for "hide the no-longer-actionable items by default").

### 5.2 Create event post

- Extends the standard post composer (still a `Post`, per `TRD.md` §4.1) with: date picker, start time (required) / end time (optional), location (autocomplete against `fetchUgaBuildings()`, same pattern as Housing §2.2 — falls back to free text if a location isn't a real building, e.g. "Tate Plaza lawn" which may or may not be in the building dataset), tag multi-select (including `FREE_FOOD`), and an optional external link field with helper text suggesting Handshake/GroupMe/a signup form.
- No date/time in the past is allowed at creation (client-side validation) — an event board is for what's upcoming, not a log of what happened.

### 5.3 Deep-link entry point

- A small "Open Handshake" button near the top of the board (same visual treatment as Housing's external buttons, §2.1) — a static deep link, not a fetch, per `PRD.md` §7.2/`TRD.md` §3.

### 5.4 Edge cases

- If the academic-calendar snapshot data is stale (e.g. no one updated it for the new term — same known risk as gym hours, `README.md`), show nothing rather than a wrong/outdated date range; don't let a stale snapshot silently display wrong information as if current. (Concretely: gate the strip on the snapshot file itself declaring the term/year it covers, and hide the strip if that doesn't match the current term.)
- An event with only a date and no `externalLink`/location should still render fine — all structured fields beyond date/start-time are optional.

## 6. Cross-board conventions

- **i18n:** every new label above uses the existing `community.*` top-level namespace (per `CLAUDE.md`'s "add to the existing page's namespace, don't create a new top-level key" rule) — e.g. `community.buySell.contactSeller`, `community.events.freeFoodFilter`, `community.housing.openStarRez`.
- **No new global state patterns:** category/tag filters follow the existing `useFavorites`/local-state conventions already in this codebase; don't introduce a new state-management library.
- **Design tokens:** any new badge/chip/segmented-control color (category badges, Sold ribbons, Free-food chip) must come from `src/design-system/colors.ts` (`category.*`/`state.*`) — add new token values there first if the existing palette doesn't already cover a needed color, per `CLAUDE.md` style rule #3.
- **Testing:** see `TRD.md` §6 for which parts of each board can be E2E-tested vs. must be component-tested (owner-authorized models can't go through Playwright's network mock).
