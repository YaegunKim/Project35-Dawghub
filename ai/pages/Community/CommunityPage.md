# CommunityPage

## 목적

커뮤니티 탭의 랜딩 페이지. 게시판 목록(자유게시판/주거/수업/중고거래/이벤트)을 카드 리스트로 보여주고, 각 카드는 `/community/:boardId`(BoardPage)로 링크만 한다. 이 페이지 자체는 데이터를 읽거나 쓰지 않는 순수 네비게이션 화면.

## 데이터 소스

- 없음. `BOARDS` 배열(`id`, `icon` 이모지)이 `CommunityPage.tsx`에 하드코딩되어 있고, Amplify 모델을 직접 호출하지 않는다.
- 실제 게시글 데이터(`Post`/`Comment` 모델)는 하위 페이지인 BoardPage(목록)·PostDetailPage(상세+댓글)에서 다룬다 — 상세는 `ai/pages/Community/BoardPage.md`, `PostDetailPage.md` 참조.
- 참고용 스키마(`amplify/data/resource.ts`):
  - `Post`: `board`(enum `GENERAL|HOUSING|CLASSES|BUY_SELL|EVENTS`), `title`, `body`, `comments`(hasMany Comment). 인가: `allow.owner()` + `allow.authenticated().to(['read'])` — 로그인한 사용자면 전체 글을 읽을 수 있고, 쓰기/수정/삭제는 작성자 본인만.
  - `Comment`: `postId`, `post`(belongsTo Post), `body`. 인가 규칙은 Post와 동일.

## 알아둘 것

- **게시판 id ↔ enum 매핑은 이 파일이 아니라 BoardPage에 있음**: `CommunityPage.tsx`의 `BOARDS` id는 camelCase(`general`, `housing`, `classes`, `buySell`, `events`)이고, `Post.board` enum은 UPPER_SNAKE(`GENERAL`, `HOUSING`, `CLASSES`, `BUY_SELL`, `EVENTS`)다. 이 둘을 잇는 `BOARD_ENUM_MAP`은 `BoardPage.tsx`에 정의돼 있다 — 게시판을 추가/변경할 때 `CommunityPage`의 `BOARDS` 배열, `BoardPage`의 `BOARD_ENUM_MAP`, `resource.ts`의 `Post.board` enum, `i18n`의 `community.boards.*` 키(ko/en) 네 곳을 모두 같이 고쳐야 한다.
- **아이콘은 이모지 하드코딩**: `S.BoardIcon`에 이모지 문자열을 그대로 렌더링(`aria-hidden`). 디자인시스템 아이콘 컴포넌트를 쓰지 않으므로 새 게시판 추가 시 어울리는 이모지를 고르면 됨.
- **라벨 텍스트는 전부 i18n**: 게시판 이름은 `t('community.boards.${board.id}')`로 조회 — `id`가 `ko.json`/`en.json`의 `community.boards` 키와 정확히 일치해야 하며, 오타가 나면 키 문자열이 그대로 화면에 노출된다(i18next 기본 동작).
- 카드 스타일(`S.BoardCard`)은 `design-system/Card`의 `CardLink`를 확장한 것 — 카드 레이아웃 자체를 바꾸려면 `Card.tsx`/`Card.style.ts` 쪽을 먼저 확인할 것.
