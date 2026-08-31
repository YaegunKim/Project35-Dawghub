# PostDetailPage

Path: `/community/:boardId/:postId` · File: `src/pages/community/PostDetailPage.tsx` (+ `.style.ts`)

## Purpose

A detail page that shows a single post (title / body) and, below it, the comment list and a comment-writing form.

## Data sources

- **`Post`** (`amplify/data/resource.ts`): `board` (enum: GENERAL/HOUSING/CLASSES/BUY_SELL/EVENTS), `title`, `body`. Fetched as a single item with `client.models.Post.get({ id: postId })`.
- **`Comment`**: `postId` (id, required), `post` (`belongsTo Post`), `body`. `Post.comments` back-references it via `hasMany('Comment', 'postId')` — but this page fetches directly with `client.models.Comment.list({ filter: { postId: { eq: postId } } })` instead of the relationship API (`post.comments()`).
- Authorization: both models are `allow.owner()` + `allow.authenticated().to(['read'])` — any signed-in user can read everything, create/update/delete is owner-only. On comment creation the `owner` field is set automatically by Amplify from the signed-in identity.
- Comment creation: after `client.models.Comment.create({ postId, body })`, the response data is appended to the end of the local `comments` array (no refetch, no realtime subscription — comments added by other users are not visible until refresh).

## Things to know

- **Back-link label is mislabeled**: `BackLink` reuses the `community.back` key (en: "Back to boards"), but the actual navigation target is `/community/${boardId}` (return to that board), not the full board list. BoardPage.tsx uses the same key for `/community` (the real list), so the text is only inaccurate on this page.
- **No pagination/sorting on the comment list**: `Comment.list` has no `limit`/`nextToken` handling, so with many comments they can be cut off at the default page size. Sorting is the server return order (creation order not guaranteed) plus newly added comments appended locally at the end.
- **No author/timestamp shown**: the `Post`/`Comment` models have no display author-name or date field (Amplify's built-in `owner`/`createdAt` do exist), so nothing is shown in the UI — if a "who wrote what, when" requirement comes up, you need to add fields to the schema and deploy with `pnpm sandbox:once --profile dawghub`.
- **If `post` is missing, the screen silently goes blank**: if `Post.get` returns null (deleted or bad id), it just `return null` with no error message — no feedback to the user.
- **No comment edit/delete UI**: the model permissions allow the owner to do it, but this page has no delete/edit buttons at all.
