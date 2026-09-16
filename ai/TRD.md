# DawgHub — Technical Requirements Document (TRD)

**Status:** Draft v1
**Last updated:** 2026-09-10
**Related docs:** [`PRD.md`](./PRD.md) (product requirements this implements), [`SPEC.md`](./SPEC.md) (per-board functional spec), root [`CLAUDE.md`](../CLAUDE.md), [`README.md`](../README.md) §"External data sources"

## 1. Current architecture recap

- **Frontend:** React 19 + TypeScript + Vite, Emotion styled-components, i18next, TanStack Query, react-router-dom, route-level code splitting.
- **Backend:** AWS Amplify Gen2 — Cognito (userPool auth, `@uga.edu`-only pre-signup Lambda), AppSync/GraphQL (`amplify/data/resource.ts`), DynamoDB, Lambda functions for anything that needs server-side execution (CORS-blocked third-party calls, elevated-privilege lookups).
- **Existing integration precedent this TRD extends, not replaces:**
  - `searchUgaClasses` (Lambda) — scrapes `reg.uga.edu`'s public Schedule-of-Classes CSV, server-side because the endpoint has no CORS headers.
  - `getProfessorRating`/`getProfessorReviews` (Lambda) — calls RateMyProfessor's unofficial internal GraphQL API server-side (no CORS, undocumented).
  - `getDiningMenu` (Lambda) — proxies Nutrislice (CORS-blocked).
  - `getFootballSchedule` (Lambda) — proxies `data.ncaa.com`'s public scoreboard JSON (no CORS).
  - `fetchUgaBuildings()` / `pnpm data:buildings` — **static snapshot** pattern for slow-changing public data (UGA's ArcGIS building layer), committed as JSON, refreshed by re-running a script only when campus construction changes it.
  - Gym hours (`src/lib/gymHours.ts`) — **hand-parsed, hardcoded** pattern for a data source with literally no feed at all (a PDF that changes URL every semester), refreshed manually.
  - Library hours (`src/lib/libraryHours.ts`) — **live client-side query** pattern for a source that's both CORS-open and needs to be always current.

Every new integration in this phase should map onto one of these four existing patterns rather than inventing a fifth. §2 gives the decision framework; §3 applies it to every source named in the PRD.

## 2. Integration decision framework

Ask, in order, for each external source:

1. **Does it require the user's personal UGA/institutional login (SSO, Athena, a resident portal)?**
   → **Deep-link only.** Open in a new tab/system browser. Never proxy, scrape behind auth, or iframe it — see §2.1 for why iframing specifically is off the table even when technically possible.
2. **Is there a public, documented, official API with a real partnership/approval process (e.g. Handshake)?**
   → Out of scope until that partnership exists. Deep-link in the meantime. Do not attempt to reverse-engineer an authenticated partner API.
3. **Is it a public page/endpoint with no login, but blocked by CORS or with no stable published contract (RMP, `reg.uga.edu` CSV, `bulletin.uga.edu`)?**
   → **Server-side Lambda proxy**, called from the client like any other AppSync query. Document it in README's "External data sources" table (unofficial, can break silently).
4. **Is the underlying real-world data slow-changing (rarely more than once a term) and CORS-open or scrapeable?**
   → **Periodic snapshot script**, committed to the repo, re-run by a human when the source actually changes (`pnpm data:*` convention). Do not poll it live for no reason.
5. **Is it public, CORS-open (or already proxied), and must reflect the live/current state every time (bus positions, today's library hours, today's dining menu)?**
   → **Live query** via TanStack Query, per `CLAUDE.md`'s data-fetching rules.
6. **Is it genuinely a different community/institution's private system (GTKSA, another school's board)?**
   → Not an integration target at all. Build an equivalent first-party feature instead (see PRD §7.4).

### 2.1 Why StarRez specifically cannot be embedded

Beyond the general "no personal-login embedding" rule in step 1: identity-bearing portals like StarRez commonly send `X-Frame-Options: DENY`/`SAMEORIGIN` or a CSP `frame-ancestors` directive specifically to prevent this — so an `<iframe src="https://uga.starrezhousing.com/...">` would likely just render blank/refuse to load even if we tried, on top of being the wrong thing to build. If a future engineer is tempted to "just iframe it," this is why not, and no amount of Leaflet-style DOM workaround (CLAUDE.md's one exception to "no inline styles") applies here — this isn't a styling problem, it's a security boundary the target site enforces.

## 3. External integration matrix

| Source | Auth needed? | Pattern (§2 step) | Notes |
|---|---|---|---|
| `housing.uga.edu` public hall pages | No | 4 (snapshot) for a "halls directory," plus a plain deep-link button | Public marketing content only — no student-specific data |
| `uga.starrezhousing.com` (StarRez) | Yes (UGA SSO) | 1 (deep-link only) | See §2.1 |
| RateMyProfessor | No (public unofficial API) | 3 (Lambda proxy) | **Already built** — `getProfessorRating`/`getProfessorReviews`, reuse as-is for the Classes board (PRD §6.3) |
| `reg.uga.edu` Schedule of Classes CSV | No | 3 (Lambda proxy) | **Already built** — `searchUgaClasses`, reuse as-is |
| `bulletin.uga.edu` course catalog | No | 3 (Lambda proxy) or 4 (per-catalog-year snapshot) | New. Catalog text changes at most once/year (new catalog edition) — a snapshot (step 4) is arguably a better fit than live-scraping every lookup; recommend prototyping as a Lambda proxy first (simpler, always current), switch to a snapshot only if the page proves slow/unreliable |
| `gtksa.net` | Yes (their own login for posting) | 6 (not an integration target) | Different institution, no API, no affiliation — see PRD §7.4 |
| Handshake | Yes (institutional partnership API) | 2 (deep-link only) | No unilateral API access exists |
| GroupMe | Yes (per-group bot/access token) | Not a fetch-side integration — supported only as an optional outbound link field a post author supplies themselves | GroupMe's API acts only on groups the token owner already belongs to; there is no "list all UGA GroupMes" capability |
| UGA academic calendar (semester dates/breaks) | No | 4 (manual snapshot, same maintenance model as gym hours) | Changes once/term at most |
| UGA campus/org events feed (e.g. a public Engage/CampusLabs calendar, if UGA runs one with a public iCal/RSS export) | Unknown — **needs a spike** | 3 or 5, depending on findings | Not yet verified whether UGA publishes a public feed for this; see §3.1 |

### 3.1 Open spike: UGA public events feed

Before committing to any specific events-feed integration beyond the academic-calendar snapshot, spend a short timeboxed spike checking whether UGA's official events calendar (or its student-org platform, if UGA runs one on CampusLabs/Presence/Engage) exposes a public, unauthenticated iCal or RSS export — many university event calendars do, the same way UGA Libraries' LibCal already exposes a public widget API this app already consumes live (`src/lib/libraryHours.ts`). If such a feed exists and is CORS-open, treat it like library hours (pattern 5, live query). If it requires auth or has no feed at all, Events launches with only the academic-calendar snapshot + user-submitted posts, and this row is revisited later — do not build a scraper against a page with no stable structure on a guess.

## 4. Data model changes

### 4.1 `Post` — extend for General/Housing/Events, keep it a discussion post

```ts
Post: a.model({
  board: a.enum(['GENERAL', 'HOUSING', 'CLASSES', 'BUY_SELL', 'EVENTS']),
  title: a.string().required(),
  body: a.string().required(),
  comments: a.hasMany('Comment', 'postId'),
  // new, all optional so existing posts and other boards are unaffected:
  category: a.string(),        // General: NOTICE|FREE_TALK|QNA|TIMETABLE
                                // Housing: DORM_REVIEW|SUBLEASE|ROOMMATE_SEARCH|null
                                // Events: tag set, see below
  courseCode: a.string(),      // Classes board only — validated against searchUgaClasses results at post-creation time
  dormBuilding: a.string(),    // Housing DORM_REVIEW/SUBLEASE — autocompleted from fetchUgaBuildings()
  eventDate: a.date(),         // Events only
  eventStartTime: a.string(),  // "HH:MM", Events only
  eventEndTime: a.string(),
  eventLocation: a.string(),   // autocompleted from fetchUgaBuildings(), Events only
  externalLink: a.url(),       // Events (Handshake/GroupMe/Google Form) or Housing sublease listing source
  tags: a.string().array(),    // Events: FREE_FOOD|CLUB|ACADEMIC|ATHLETICS|GREEK_LIFE|OTHER
  likeCount: a.integer().default(0),
})
```

Rationale for extending `Post` with optional per-board fields rather than a parallel model per board: General/Housing/Events posts are still fundamentally *discussion* (title + body + comment thread) with a few extra structured attributes layered on, and they share the exact same board-list/detail/comment UI already built (`CommunityPage`/`BoardPage`/`PostDetailPage`). A parallel model would duplicate that UI for no benefit. **Buy & Sell is the exception** — a listing's core identity (price, photos, sold-status) is different enough in kind, and its query patterns (filter by category/status, hide sold) different enough from a discussion feed, that it gets its own model (§4.2).

### 4.2 New model: `MarketplaceListing` (Buy & Sell)

```ts
MarketplaceListing: a.model({
  title: a.string().required(),
  description: a.string().required(),
  price: a.float().required(),
  category: a.enum(['TEXTBOOKS', 'FURNITURE', 'ELECTRONICS', 'CLOTHING', 'TICKETS', 'OTHER']),
  condition: a.enum(['NEW', 'LIKE_NEW', 'GOOD', 'FAIR']),
  status: a.enum(['ACTIVE', 'RESERVED', 'SOLD']),
  photoKeys: a.string().array(),   // S3 object keys, see §4.3
  sellerEmail: a.string().required(), // denormalized, same pattern as Friendship.senderEmail — shown only on "Contact seller" tap, not in list view
})
.authorization((allow) => [allow.owner(), allow.authenticated().to(['read'])])
```

Same authorization shape as `Post`: public read among signed-in `@uga.edu` users, owner-only write. `sellerEmail` is denormalized at creation time (same rationale as `Friendship.senderEmail`/`recipientEmail`) so "Contact seller" doesn't need a second privileged lookup.

### 4.3 New infra: Amplify Storage (S3) for listing photos

Nothing in this codebase uses Amplify Storage today — Buy & Sell is the first feature that needs image upload. Add `amplify/storage/resource.ts` (`defineStorage`) with a path scoped per-owner for uploads (`marketplace-photos/{entity_id}/*`) and public-read access for signed-in users, mirroring the auth shape of `MarketplaceListing` itself. Client-side, resize/compress images before upload (a fixed max dimension, e.g. 1600px) to keep listing photos small — there's no existing precedent for this in the codebase, so pick a lightweight approach (e.g. canvas-based downscale) rather than a new dependency unless one is already justified elsewhere.

### 4.4 New Lambda: `getCourseCatalogEntry`

```ts
CourseCatalogEntry: a.customType({
  courseCode: a.string(),
  creditHours: a.string(),
  description: a.string(),
  prerequisites: a.string(),
})

getCourseCatalogEntry: a.query()
  .arguments({ courseCode: a.string().required() })
  .returns(a.ref('CourseCatalogEntry'))
  .authorization((allow) => [allow.authenticated()])
  .handler(a.handler.function(getCourseCatalogEntryFn))
```

Proxies `bulletin.uga.edu/Course/<subject>/<number>` (or the catalog's search endpoint — confirm exact URL shape during implementation, same discovery process already used for the `reg.uga.edu` CSV and RMP's GraphQL endpoint). Same "unofficial, can break silently" caveat as the two existing scrapers — document in README next to them.

### 4.5 Anonymous per-thread labeling (General board, PRD §6.1 AC2)

Cannot be computed purely client-side (a client only sees its own `owner` value, never other participants'). Needs either:
- a Lambda resolver on `Post`/`Comment` read that maps each distinct `owner` seen within one thread to a stable per-thread ordinal (1st distinct poster = "익명1", 2nd = "익명2", ...), computed on read and not stored, **or**
- a stored `anonNumber` field written at comment-creation time by a lightweight Lambda that reads the thread's existing comments first to determine the next number (accepts a small race-condition risk under concurrent posts — acceptable for a low-stakes cosmetic label, unlike e.g. payment ordering).

Recommend the second (store at write time) — cheaper to read, and Comment/Post creation already goes through the client's mutation call so adding a pre-mutation Lambda step (or a DynamoDB Streams trigger that patches the field right after insert) is a contained change with no impact on existing read paths.

## 5. Security, privacy, and moderation

- **No credential collection for third-party services, ever** (§2.1). This is a hard rule, not a per-feature judgment call.
- **`sellerEmail`/anonymous-label design must not leak real identity where the product promises anonymity.** General-board posts must never surface `owner`/email anywhere in the API response shape the client renders from — audit this specifically when building anonymous labeling (§4.5), since it's easy to accidentally include the raw owner string in a debug log or a "you can edit your own post" check that also renders it.
- **Content moderation.** Once General/Buy & Sell have real traffic, two things are needed that don't exist yet: (1) a **report** action on posts/comments/listings (a `Report` model: `targetType`, `targetId`, `reason`, reporter's owner), and (2) at minimum a manual admin review queue (an internal-only page or even a direct DynamoDB console review process for the pilot phase — a full auto-moderation pipeline is not phase-1 scope, but the `Report` model and a place for reports to land is).
- **Marketplace fraud surface.** Buy & Sell inherits the same `@uga.edu`-only trust model as the rest of the app, which is real but not absolute (a compromised/rented UGA account still passes Cognito auth) — the "Contact seller" disclosure pattern (PRD §6.4 AC3) deliberately keeps a manual, in-person, cash/Venmo-off-platform handoff (matching how Karrot/GTKSA actually work), so DawgHub is never a party to the transaction or holding funds.
- **Image content.** Uploaded marketplace photos are user-generated content with no moderation pipeline in phase 1 — flag as a known gap in the same place as the `Report` model above; do not treat this TRD's silence as "solved."

## 6. Testing approach

Follow existing conventions from `CLAUDE.md`'s Testing section:
- Pure logic (course-code validation, anonymous-numbering assignment logic, listing status transitions, free-food tag filtering) → colocated Vitest unit tests, same pattern as `scheduleGrid.ts`/`dining.ts`.
- New board UI (structured Housing/Events post forms, Buy & Sell listing form/list/detail) → component tests via `renderWithProviders`, mocking `../../lib/amplifyClient`'s `client` export directly — **`Post`/`MarketplaceListing` are `allow.owner()`-flavored** (owner + authenticated-read), which per `CLAUDE.md`'s documented limitation means they **cannot** be exercised through Playwright's `**/graphql` network-boundary mock (the client throws before any request when there's no real Cognito session under the E2E auth bypass). Component tests are the only option for anything that touches `Post`/`Comment`/`MarketplaceListing`, exactly as already true for `ClassEntry`/`Friendship`.
- New Lambda proxies (`getCourseCatalogEntry`) → unit-test the parsing logic in isolation (given a saved sample HTML/response fixture, does it extract the right fields), same spirit as how `searchUgaClasses`'s CSV parsing should be (and, if not already, should become) testable independent of the live network call.
- Deep-link buttons (Housing/StarRez/Handshake "open external site") → these are plain `window.open`/anchor-tag flows with no backend dependency, testable as ordinary component tests asserting the correct URL, no E2E/network mocking needed.
