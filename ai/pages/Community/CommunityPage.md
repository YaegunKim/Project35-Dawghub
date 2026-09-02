# CommunityPage

## Purpose

Landing page for the Community tab. Shows the list of boards (General / Housing / Classes / Buy & Sell / Events) as a card list; each card only links to `/community/:boardId` (BoardPage). This page itself neither reads nor writes any data — it is a pure navigation screen.

## Data sources

- None. The `BOARDS` array (`id`, `icon` emoji) is hardcoded in `CommunityPage.tsx`, and no Amplify model is called directly.
- The actual post data (`Post` / `Comment` models) is handled by the child pages BoardPage (list) and PostDetailPage (detail + comments) — see `ai/pages/Community/BoardPage.md` and `PostDetailPage.md`.
- Schema for reference (`amplify/data/resource.ts`):
  - `Post`: `board` (enum `GENERAL|HOUSING|CLASSES|BUY_SELL|EVENTS`), `title`, `body`, `comments` (hasMany Comment). Authorization: `allow.owner()` + `allow.authenticated().to(['read'])` — any signed-in user can read every post, but create/update/delete is restricted to the author.
  - `Comment`: `postId`, `post` (belongsTo Post), `body`. Same authorization rules as Post.

## Things to know

- **The board id ↔ enum mapping lives in BoardPage, not this file**: the `BOARDS` ids in `CommunityPage.tsx` are camelCase (`general`, `housing`, `classes`, `buySell`, `events`), while the `Post.board` enum is UPPER_SNAKE (`GENERAL`, `HOUSING`, `CLASSES`, `BUY_SELL`, `EVENTS`). The `BOARD_ENUM_MAP` that connects the two is defined in `BoardPage.tsx` — when adding or changing a board you must update all four places together: the `BOARDS` array in `CommunityPage`, `BOARD_ENUM_MAP` in `BoardPage`, the `Post.board` enum in `resource.ts`, and the `community.boards.*` keys (ko/en) in `i18n`.
- **Icons are hardcoded emoji**: `S.BoardIcon` renders the emoji string directly (`aria-hidden`). No design-system icon component is used, so for a new board just pick a fitting emoji.
- **All label text goes through i18n**: board names are looked up with `t('community.boards.${board.id}')` — the `id` must match the `community.boards` keys in `ko.json` / `en.json` exactly, or the key string itself will be shown on screen (default i18next behavior).
- The card style (`S.BoardCard`) extends `CardLink` from `design-system/Card` — to change the card layout itself, look at `Card.tsx` / `Card.style.ts` first.
