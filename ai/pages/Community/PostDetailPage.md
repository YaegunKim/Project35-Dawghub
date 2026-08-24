# PostDetailPage

경로: `/community/:boardId/:postId` · 파일: `src/pages/community/PostDetailPage.tsx` (+ `.style.ts`)

## 목적

게시글 하나를 제목/본문으로 보여주고, 그 아래에 댓글 목록과 댓글 작성 폼을 제공하는 상세 페이지.

## 데이터 소스

- **`Post`** (`amplify/data/resource.ts`): `board`(enum: GENERAL/HOUSING/CLASSES/BUY_SELL/EVENTS), `title`, `body`. `client.models.Post.get({ id: postId })`로 단건 조회.
- **`Comment`**: `postId`(id, required), `post`(`belongsTo Post`), `body`. `Post.comments`가 `hasMany('Comment', 'postId')`로 역참조 — 단, 이 페이지는 관계 API(`post.comments()`) 대신 `client.models.Comment.list({ filter: { postId: { eq: postId } } })`로 직접 조회.
- 인가: 두 모델 다 `allow.owner()` + `allow.authenticated().to(['read'])` — 로그인한 사용자는 전부 읽기 가능, 생성/수정/삭제는 owner(작성자 본인)만. 댓글 작성 시 `owner` 필드는 Amplify가 로그인 identity로 자동 세팅.
- 댓글 작성: `client.models.Comment.create({ postId, body })` 후 응답 데이터를 로컬 `comments` 배열 뒤에 append (재조회 없음, 실시간 구독도 없음 — 다른 사용자가 단 댓글은 새로고침 전까지 안 보임).

## 알아둘 것

- **뒤로가기 라벨 오표기**: `BackLink`에 `community.back` 키(ko: "게시판 목록으로" / en: "Back to boards")를 그대로 재사용하는데, 실제 이동 대상은 `/community/${boardId}` (해당 보드로 복귀)이지 전체 게시판 목록이 아님. BoardPage.tsx도 같은 키를 `/community`(진짜 목록)로 쓰고 있어 텍스트가 이 페이지에만 부정확하게 적용됨.
- **댓글 목록에 페이지네이션/정렬 없음**: `Comment.list`에 `limit`/`nextToken` 처리가 없어 댓글이 많아지면 기본 페이지 크기에서 잘릴 수 있음. 정렬은 서버 반환 순서(생성 순 보장 안 됨) + 새로 단 댓글만 로컬에서 맨 뒤에 append.
- **작성자/시간 정보 미표시**: `Post`/`Comment` 모델에 표시용 작성자 이름이나 작성일 필드가 없어(Amplify 기본 `owner`/`createdAt`은 존재하지만) UI에 아무도 안 보여줌 — "누가 언제 썼는지" 요구사항이 생기면 스키마에 필드 추가 + `pnpm sandbox:once --profile dawghub` 배포 필요.
- **`post`가 없으면 조용히 빈 화면**: `Post.get` 결과가 null이면(삭제됐거나 잘못된 id) 에러 메시지 없이 `return null` — 사용자에게 아무 피드백이 없음.
- **댓글 수정/삭제 UI 없음**: 모델 권한상 owner는 가능하지만 이 페이지엔 삭제/수정 버튼 자체가 없음.
