# BoardPage

라우트: `/community/:boardId`

## 목적

특정 게시판(자유게시판/주거/수업/중고거래/이벤트)의 게시글 목록을 보여주고, 새 글을 작성하는 페이지. `CommunityPage`(게시판 목록)와 `PostDetailPage`(글+댓글 상세) 사이의 중간 단계.

## 데이터 소스

- `Post` 모델 (`amplify/data/resource.ts`)
  - 필드: `board`(enum: `GENERAL`/`HOUSING`/`CLASSES`/`BUY_SELL`/`EVENTS`), `title`(required), `body`(required), `comments`(hasMany `Comment`)
  - 인가: `allow.owner()` + `allow.authenticated().to(['read'])` — 로그인한 사용자면 누구나 읽기 가능, 쓰기(생성/수정/삭제)는 소유자만. 생성 시 owner는 Cognito 세션에서 암묵적으로 채워짐(별도 authorId 필드 없음).
  - 조회: `client.models.Post.list({ filter: { board: { eq: boardValue } } })` — board별 인덱스가 아닌 클라이언트 필터. 데이터가 많아지면 비효율적일 수 있음.
  - 생성: `client.models.Post.create({ board, title, body })`, 성공 시 로컬 state 맨 앞에 optimistic하게 추가.

## 알아둘 것

- **URL의 `boardId`(`general`/`housing`/`classes`/`buySell`/`events`)는 `BOARD_ENUM_MAP`을 통해 Post의 `board` enum 값으로 변환됨.** 새 게시판을 추가하려면 (1) `amplify/data/resource.ts`의 `board` enum, (2) `BOARD_ENUM_MAP`, (3) `ko.json`/`en.json`의 `community.boards.*` 세 곳을 모두 고치고 `pnpm sandbox:once --profile dawghub`로 배포해야 함.
- **`boardId`가 유효하지 않으면 `null`을 렌더링**할 뿐 리다이렉트나 에러 UI가 없음 (404 페이지 없음).
- **정렬/페이지네이션 없음.** `list()`가 반환하는 순서는 DynamoDB 스캔 순서일 뿐 작성일 기준이 아니고(정렬 키 없음), `nextToken` 처리도 없어 첫 페이지(기본 100건)만 표시됨.
- **새 글 작성 후 낙관적으로 로컬 state 맨 앞에 붙이는 것뿐**이라, 새로고침하면 실제 DB 순서(작성일 순 보장 안 됨)로 다시 보일 수 있음 — 위 정렬 부재와 연결된 이슈.
- **작성자 표시가 없음.** `Post`에 author 이름 필드가 없고 owner는 인가 규칙에만 쓰이는 암묵적 값이라 화면에 "누가 썼는지" 표시할 방법이 현재 없음.
- **이 페이지에는 수정/삭제 UI가 없음.** 인가 규칙상 소유자는 수정/삭제 가능하지만 프론트엔드에 버튼이 없어 실제로는 작성만 가능.
- 게시글 클릭 시 `/community/${boardId}/${post.id}`로 이동 → `PostDetailPage`에서 댓글(`Comment` 모델) 처리.
