# BoardPage

Route: `/community/:boardId`

## Purpose

Shows the list of posts for a specific board (General / Housing / Classes / Buy & Sell / Events) and lets the user write a new post. The intermediate step between `CommunityPage` (board list) and `PostDetailPage` (post + comments detail).

## Data sources

- `Post` model (`amplify/data/resource.ts`)
  - Fields: `board` (enum: `GENERAL`/`HOUSING`/`CLASSES`/`BUY_SELL`/`EVENTS`), `title` (required), `body` (required), `comments` (hasMany `Comment`)
  - Authorization: `allow.owner()` + `allow.authenticated().to(['read'])` — any signed-in user can read, but writes (create/update/delete) are owner-only. On create, the owner is filled implicitly from the Cognito session (there is no separate `authorId` field).
  - Query: `client.models.Post.list({ filter: { board: { eq: boardValue } } })` — a client-side filter, not a per-board index. Can become inefficient as data grows.
  - Create: `client.models.Post.create({ board, title, body })`; on success the new post is optimistically prepended to local state.

## Things to know

- **The `boardId` in the URL (`general`/`housing`/`classes`/`buySell`/`events`) is converted to the `Post` `board` enum value via `BOARD_ENUM_MAP`.** To add a new board you must update all three of (1) the `board` enum in `amplify/data/resource.ts`, (2) `BOARD_ENUM_MAP`, (3) the `community.boards.*` keys in `ko.json` / `en.json`, then deploy with `pnpm sandbox:once --profile dawghub`.
- **Invalid `boardId` shows an `EmptyState` message** (`community.notFound`) instead of a blank page — fixed from an earlier `return null`. There is still no redirect, just an in-place message + the `BackLink`.
- **Post creation now has real feedback**: the submit button uses `Button`'s `loading` state while the request is in flight, empty title/body shows an inline `S.FieldError` instead of silently no-opping, and a failed create shows a `useToast()` danger toast (`community.postFailed`) — the form is only cleared on success (previously it cleared unconditionally, which could make a failed post look like it succeeded).
- **The post list now distinguishes "empty" from "failed to load"**: `useQuery`'s `isError` renders an `EmptyState` + a `Button size="sm" variant="secondary"` "Retry" (calling `refetch()`) instead of falling through to the same UI as a genuinely empty board.
- **No sorting or pagination.** The order returned by `list()` is just the DynamoDB scan order, not by creation date (there is no sort key), and there is no `nextToken` handling, so only the first page (100 items by default) is shown.
- **After writing a new post it is only optimistically prepended to local state**, so a refresh may show it back in the real DB order (which is not guaranteed to be by creation date) — this is tied to the missing-sort issue above.
- **No author display.** `Post` has no author-name field and the owner is an implicit value used only for authorization, so there is currently no way to show "who wrote this" on screen.
- **This page has no edit/delete UI.** The authorization rules allow the owner to edit/delete, but there are no buttons in the frontend, so in practice only creation is possible.
- Clicking a post navigates to `/community/${boardId}/${post.id}` → `PostDetailPage`, which handles comments (`Comment` model).
