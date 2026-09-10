# DawgHub — Product Requirements Document (PRD)

**Status:** Draft v1
**Owner:** Product/Community
**Last updated:** 2026-09-10
**Related docs:** [`TRD.md`](./TRD.md) (technical feasibility + architecture), [`SPEC.md`](./SPEC.md) (per-board functional spec), root [`CLAUDE.md`](../CLAUDE.md) (engineering conventions), [`README.md`](../README.md) (external data source registry)

## 1. Summary

DawgHub is a PWA for University of Georgia students that already ships Community boards, Schedule, Map, and Dining in one app, gated to `@uga.edu` email. This PRD scopes the next phase: turning the **Community tab's five boards** (General, Housing, Classes, Buy & Sell, Events) from generic title/body message boards into UGA's answer to **Everytime** (에브리타임) — Korea's dominant campus super-app — while wiring each board to the real UGA systems students already use today (registration, RateMyProfessor, housing, event listings, marketplace).

The reference points named for this phase:
- **General** → Everytime's free-form boards (익명 게시판, 공지, 시간표 공유)
- **Housing** → deep integration with `housing.uga.edu` (public info) and the StarRez resident portal (`uga.starrezhousing.com`)
- **Classes** → RateMyProfessor + `reg.uga.edu` schedule of classes + `bulletin.uga.edu` catalog
- **Buy & Sell** → a Karrot(당근마켓)/GTKSA-style marketplace, not literal integration with GTKSA (a different school's site — see §7)
- **Events** → UGA's academic calendar, campus/club events, Handshake, GroupMe, with "free food" as a first-class use case

## 2. Problem & opportunity

UGA students today stitch together a half-dozen disconnected tools to do what one app should do:

| Need | Current tool | Pain |
|---|---|---|
| Campus chatter, Q&A, "does anyone have notes for X" | GroupMe chats, Instagram meme accounts, Reddit r/UGA | No structure, unsearchable, no board separation |
| Find/review housing | `housing.uga.edu`, word of mouth | No student reviews, no "which dorm has AC" crowd knowledge |
| Pick classes / avoid bad professors | Athena (SSO-only), RateMyProfessor (separate app), bulletin PDF | 3 separate lookups per class, no discussion of the class itself |
| Buy/sell textbooks, furniture, tickets | Facebook Marketplace, GroupMe "UGA Buy Sell Trade", Instagram | Not UGA-verified (strangers, scams), no in-app trust signal |
| Find events / free food | Handshake, UGA Engage, random GroupMes, physical flyers | Scattered across 4+ platforms, easy to miss "free pizza at the Tate Plaza right now" |

DawgHub's advantage over all of the above: **every user is a verified `@uga.edu` student** (Cognito pre-signup Lambda already enforces this). That verified-identity layer is the trust foundation Facebook Marketplace/Instagram/GroupMe don't have, and is the same trust model Everytime and Karrot built their growth on at other schools/in Korea.

## 3. Goals

- G1 — Make the Community tab the daily-open reason for the app (today it's a secondary tab behind Schedule/Map/Dining).
- G2 — Each board should do one job Everytime/RMP/a marketplace app already does well, adapted to UGA's real data sources, not a generic forum shell.
- G3 — Every external integration follows the trust/safety bar already set in this codebase: never ask a student to type their UGA SSO password into a surface we don't control (see §7, `TRD.md` §2).
- G4 — Ship incrementally against the existing Amplify Gen2 + Post/Comment foundation; don't throw away what's built (RMP + `reg.uga.edu` are already live in the Schedule tab — see §6.3).

### Non-goals (this phase)

- Building a payment/checkout flow for Buy & Sell (out-of-app cash/Venmo handoff, like Karrot's MVP, is in scope; in-app payments are not).
- Becoming the system of record for official UGA data (registration, housing assignment) — DawgHub reads/links to official systems, it never lets a student register for a class or accept a housing assignment from inside the app.
- Real-time chat / DMs (Buy & Sell contact is a "reveal contact" pattern in this phase, not a chat product — see `SPEC.md` §4).

## 4. Personas

- **Incoming freshman (Maya)** — needs to pick a dorm and first-semester classes, doesn't know which professors to avoid, wants to find people/events to meet people.
- **Returning sophomore/junior (Jordan)** — churns through textbooks and furniture every semester, wants to sublease over the summer, already has a friend group but wants free food/event alerts.
- **Grad/transfer student (Priya)** — less plugged into UGA's undergrad-social-media ecosystem (GroupMe/Instagram), wants a single low-noise place for logistics (classes, housing, events) without wading through meme content.

## 5. Success metrics

North star: **Community WAU / total app MAU** (today, Community is one of five equal tabs with no data suggesting it's the primary draw).

Per-board metrics:
| Board | Primary metric | Secondary |
|---|---|---|
| General | Posts + comments per WAU | % of sessions that open General first |
| Housing | Clicks on "Open housing.uga.edu"/StarRez deep links, Housing board posts | Dorm-review post volume near housing selection season (Feb–Mar) |
| Classes | Class-lookup panel opens, "discuss this class" posts | RMP rating-badge taps (already trackable — reuse Schedule's existing UX) |
| Buy & Sell | Listings created, "contact seller" taps | Listing → marked-SOLD rate |
| Events | Event posts, "free food" filter uses | Deep-link-outs to Handshake/GroupMe |

## 6. Feature requirements by board

Each board section states: **current state** (what's already shipped, so this PRD doesn't re-litigate it), **user stories**, and **acceptance criteria** at PRD level. Full UX/edge-case detail is in `SPEC.md`.

### 6.1 General

**Current state:** `Post`/`Comment` models exist, board filter works, no author name is ever shown (owner is implicit, used only for write-authorization) — the app is *already* de-facto anonymous by omission (see `ai/pages/Community/BoardPage.md`). No categories, no likes/scrap, no search.

**User stories**
- As a student, I want to post anonymously under a per-thread handle (like Everytime's "익명1/익명2"), not with zero identity at all, so a conversation can still be followed.
- As a student, I want to tag a post as Notice/Free talk/Q&A/Timetable-sharing so the board isn't one undifferentiated feed.
- As a student, I want to like/scrap(bookmark) a post.

**Acceptance criteria**
- AC1: Posting on General never displays the author's real name/email anywhere in the UI (formalizing the current accidental behavior into an explicit product decision).
- AC2: Each post is assigned a stable per-thread anonymous label ("익명1"), and each *comment* on that post gets its own sequential label ("익명2", "익명3", ...) scoped to that thread — this matches Everytime's exact mental model and must be computed server-side (a Lambda or resolver, not the client) since it requires seeing all participants of a thread, which owner-scoped `Comment.owner` alone doesn't expose to other readers.
- AC3: General posts carry a `category` field (`NOTICE | FREE_TALK | QNA | TIMETABLE`); the board UI filters by category via a segmented control.
- AC4: A user can like a post once (idempotent) and scrap it to a personal saved list.

### 6.2 Housing

**Current state:** `HOUSING` board exists as a generic Post board only. No connection to `housing.uga.edu` or StarRez. `MapPreference.myDormBuilding` already lets a user pick "my dorm" on the Map tab.

**User stories**
- As a student researching housing, I want one tap to open UGA's official housing site and, separately, one tap to open my StarRez resident portal (to see my own room/roommate/contract), without DawgHub ever seeing my UGA password.
- As a student, I want to read dorm reviews from students who've actually lived there (AC, noise, RA quality) — something neither `housing.uga.edu` nor StarRez offers.
- As a student subletting or looking for a roommate, I want a structured (not free-text-only) post: which hall/apartment, dates, price.

**Acceptance criteria**
- AC1: A prominent "Open UGA Housing" and "Open my StarRez portal" action opens each site in a **new browser tab / system browser**, never inside an iframe (see `TRD.md` §2 for why StarRez specifically cannot and should not be embedded).
- AC2: Housing board posts can optionally be tagged `DORM_REVIEW` with a `dormBuilding` field, autocompleted against the same UGA building list already powering Map/Schedule (`fetchUgaBuildings()`), so a review is attributable to a real, spellchecked hall.
- AC3: A `SUBLEASE`/`ROOMMATE_SEARCH` post subtype captures structured fields (building, move-in/out dates, monthly rent) rather than relying on the poster to remember to type them into free text.
- AC4 (stretch): The Housing board surfaces a small "Halls directory" (name, photo, official page link) sourced from a periodic static snapshot of `housing.uga.edu`'s public hall list — same pattern as `ugaBuildingsData.json`. This is public marketing content, not the login-gated portal.

### 6.3 Classes

**Current state:** already substantially built, just not in the Community tab. The **Schedule** page's "search and add a class" flow already calls `searchUgaClasses` (scrapes `reg.uga.edu`'s public Schedule-of-Classes CSV server-side) and `getProfessorRating`/`getProfessorReviews` (RateMyProfessor's unofficial API, server-side) — see `ai/pages/Schedule/SchedulePage.md`. `bulletin.uga.edu` (the course catalog: descriptions, prerequisites, credit hours) is **not yet** integrated anywhere.

**User stories**
- As a student browsing the Classes community board, I want to attach my post to a real course code (validated against the real schedule of classes, not free text), so "anyone taking CSCI 4060 this fall?" threads naturally cluster per course.
- As a student deciding on a class, I want to see the professor's RMP rating and the catalog description without leaving the Classes board.

**Acceptance criteria**
- AC1: Creating a Classes-board post offers a course-code lookup/autocomplete backed by the same data `searchUgaClasses` already returns, and stores the picked `courseCode` on the post.
- AC2: The Classes board can be filtered/grouped by course code, and a course-code "chip" on a post deep-links to a small panel showing that course's current-term sections + RMP ratings for its instructors (reusing existing `getProfessorRating`/`getProfessorReviews`, not rebuilding them).
- AC3: A new lookup surfaces the `bulletin.uga.edu` catalog description (prerequisites, credit hours, official description text) for a given course code.
- AC4: This phase does **not** duplicate the Schedule tab's full add-a-class flow inside Community — Classes-board posts link to/reuse that flow rather than reimplementing course search twice.

### 6.4 Buy & Sell

**Current state:** `BUY_SELL` board is a generic Post board (title/body only) — no price, images, category, or sold/available status.

**User stories**
- As a seller, I want to list an item with photos, price, category, and condition, and mark it Sold when it's gone.
- As a buyer, I want to filter by category (Textbooks/Furniture/Electronics/Tickets/Clothing/Other) and see only active listings by default.
- As a buyer, I want a low-friction, UGA-verified way to contact the seller without the app hosting real-time chat (yet).

**Acceptance criteria**
- AC1: A listing has price, category, condition, up to N photos, and a status (`ACTIVE`/`RESERVED`/`SOLD`).
- AC2: The default Buy & Sell view hides `SOLD` listings behind a toggle (matches Karrot/GTKSA convention of a clean "still available" feed).
- AC3: A "Contact seller" action reveals the seller's `@uga.edu` email/a mailto link only to a signed-in viewer who taps it (not shown in the list view) — see `SPEC.md` §4 for the exact disclosure UX and why this is the MVP contact mechanism instead of in-app chat.
- AC4: Explicitly **not** a scrape/embed of `gtksa.net` (a Georgia Tech, not UGA, community site with no public API or affiliation with this project) — GTKSA/Karrot are named only as the UX pattern to emulate. See §7.

### 6.5 Events

**Current state:** `EVENTS` board is a generic Post board. No calendar, no external event source, no free-food filter.

**User stories**
- As a student, I want to see what's happening on campus this week without checking Handshake, UGA Engage, and five different GroupMes.
- As a student, I want a one-tap filter for "free food" events specifically (a genuinely popular, well-known college use case).
- As an event organizer (club officer), I want to post an event with a date/time/location and optionally attach an external RSVP link (Handshake event page, GroupMe join link, Google Form).

**Acceptance criteria**
- AC1: An Events post has structured `eventDate`, `startTime`, optional `endTime`, `location` (autocompleted against UGA buildings, reusing the same pattern as Housing/Schedule), and an optional `externalLink`.
- AC2: A `tags` field supports at least `FREE_FOOD | CLUB | ACADEMIC | ATHLETICS | GREEK_LIFE | OTHER`; the board has a one-tap "🍕 Free food" filter chip surfaced above the generic tag filter.
- AC3: The official UGA Fall/Spring academic-calendar dates (semester start/end, breaks, finals) are shown as a small non-interactive reference list at the top of the board — sourced from a manually-maintained snapshot (same maintenance model already accepted for gym hours in this codebase; see `TRD.md` §3).
- AC4: Events do **not** attempt a live Handshake or GroupMe API integration (no public third-party API exists for either — see §7); both are supported only as an optional outbound link field on a post, plus a static "Open Handshake" deep link.

## 7. Constraints, risks, and explicit out-of-scope calls

These are product decisions, not just engineering footnotes — each one changes what a board can promise its users. Full technical justification is in `TRD.md` §2–3.

1. **We will never embed a third-party login form (StarRez) inside DawgHub**, even though it's technically possible to ask the user to. Training students to type their UGA SSO credentials into a page hosted by a student-built app is a phishing-shaped pattern regardless of intent, and StarRez almost certainly blocks framing anyway (`X-Frame-Options`/CSP). Housing "integration" means deep-linking out, not embedding in.
2. **Handshake has no public third-party API.** Handshake API access requires a direct institutional partnership between Handshake and UGA's Career Center — not something obtainable unilaterally. Events "integration" with Handshake is a deep link, same as Housing/StarRez.
3. **GroupMe integration is per-group and consent-based, not a discovery feed.** GroupMe's API can only act on behalf of a group a token-holder already belongs to; there is no way to "connect to all UGA GroupMes." Support is limited to letting an event's poster attach their own group's join link.
4. **GTKSA (`gtksa.net`) is a Georgia Tech student-org site, unaffiliated with UGA or this project**, with no public API and its own login wall. It is referenced here purely as a proven UX pattern for a campus marketplace (like Karrot/당근마켓), not as an integration target. Building "our own GTKSA-style board" — not "connecting to GTKSA" — is the correct read of this requirement, and is what §6.4 scopes.
5. **RateMyProfessor and `reg.uga.edu`'s Schedule-of-Classes CSV are unofficial, undocumented endpoints** the current app already depends on (Schedule tab) — this PRD extends that existing, already-accepted risk to the Classes board rather than introducing a new one. `bulletin.uga.edu` scraping carries the same category of risk and should follow the same "server-side proxy, no public commitment to uptime" posture.
6. **Content moderation is a hard requirement, not a nice-to-have**, the moment General/Buy & Sell see real usage beyond a small pilot — see `TRD.md` §6.

## 8. Phasing

- **Phase 1 (foundation):** General categories + anonymous-thread labeling + likes/scrap; Buy & Sell structured listing model (price/category/photos/status); Events structured fields + free-food filter + academic-calendar snapshot; Housing deep-link buttons + dorm-review tagging.
- **Phase 2:** Classes-board course-code linking to existing RMP/SOC data + new `bulletin.uga.edu` catalog lookup; Housing halls directory snapshot; sublease/roommate structured posts.
- **Phase 3 (stretch):** In-app chat for Buy & Sell (replacing "reveal contact"), search across all boards, push notifications for replies/likes, per-course discussion aggregation view ("everything anyone's posted about CSCI 4060").
