# DawgHub — UGA 학생 커뮤니티 앱

## 프로젝트 개요

UGA(University of Georgia) 학생을 위한 PWA — 커뮤니티 게시판, 시간표, 캠퍼스 지도, 학식 메뉴를 한 앱에서 제공.
- **가입 제한**: `@uga.edu` 이메일만 (Cognito Pre-signup Lambda, 서버 단 검증)
- **기술 스택**: React 19 + TypeScript + Vite · Emotion styled-components · i18next (en/ko) · AWS Amplify Gen2 (Cognito + AppSync/GraphQL + DynamoDB) · Leaflet(지도)

---

## 로컬 개발

```bash
pnpm install
pnpm dev              # vite dev 서버
pnpm build            # tsc -b && vite build
pnpm sandbox:once --profile dawghub   # Amplify 백엔드 스키마 변경 후 1회 배포
```

⚠️ **AWS 프로필**: 이 프로젝트는 `dawghub` AWS 프로필을 쓴다. `pnpm sandbox`/`sandbox:once`를 프로필 없이 그냥 실행하면 기본 프로필(다른 계정)로 잡혀서 `SSMCredentialsError`가 난다 — 백엔드 배포 시 항상 `npx ampx sandbox --once --profile dawghub` 형태로 명시할 것. Cognito 관리 명령(`aws cognito-idp admin-create-user` 등)도 마찬가지로 `--profile dawghub` 필요.

`amplify/data/resource.ts`에 모델을 추가/수정하면 `pnpm sandbox:once`(위 프로필 포함)로 배포해야 프론트엔드에서 실제로 쓸 수 있다 (로컬 타입만 갱신되는 게 아니라 AppSync 스키마 자체가 바뀜).

---

## Git 커밋

- 커밋 메시지는 한국어, 무엇을·왜 고쳤는지 간결하게.
- `Co-Authored-By: Claude ...` 트레일러 포함 (기본 템플릿 유지).
- 사용자가 명시적으로 요청하기 전엔 커밋하지 않는다.

---

## 디렉터리 구조

```
src/
  app/
    App.tsx                # 라우팅 (react-router-dom)
    AppShell/               # 반응형 레이아웃 — 모바일 하단 탭 / 태블릿 컴팩트 사이드바 / 데스크톱 풀 사이드바
  design-system/            # 재사용 빌딩 블록
    colors.ts               #   - brand(정적 브랜드색) · surface(테마 CSS 변수 재노출) · state(위험 등 UI 상태색) · category(지도/시간표 카테고리색)
    typography.ts           #   - fontFamily.body/display, size, weight 스케일
    spacing.ts / radius.ts / shadow.ts / motion.ts   #   - 4px 그리드 spacing, radius(sm/md/lg/pill), elevation shadow, transition duration/easing 토큰
    GlobalStyles.tsx         #   - :root CSS 변수(라이트/다크 테마) 정의, --font-body/--font-display 브릿지, data-theme 오버라이드
    Brand/Logo.tsx           #   - 오리지널 불독 마크 SVG 컴포넌트 (인앱 렌더링용)
    Skeleton/Skeleton.tsx    #   - 로딩 시 실제 레이아웃을 흉내내는 shimmer 블록 (width/height/radius props)
    (Page, Card, Button, Input, Textarea, Select, IconButton, EmptyState, BackLink)
  app/ThemeContext.tsx      # 다크모드 수동 전환 (system/light/dark), localStorage `dawghub:theme`에 영속화
  pages/
    community/  schedule/  map/  dining/  settings/    # 라우팅 단위 페이지 (Page.tsx + Page.style.ts 쌍, 상세는 ai/pages/ 참조)
  lib/                       # Amplify data client, 외부 API 클라이언트(Passio 버스, UGA 건물/도서관/체육관/학식 데이터)
    queryClient.ts           #   - TanStack Query 싱글턴 (기본 staleTime 60s), main.tsx에서 QueryClientProvider로 배선
    queryKeys.ts             #   - 여러 페이지가 공유하는 쿼리 키 (예: CLASS_ENTRIES_KEY — Schedule/Map이 같은 캐시 공유)
  i18n/locales/{en,ko}.json  # 번역 리소스 — 두 파일 항상 동일 키 구조
amplify/
  auth/    # Cognito (email 로그인, @uga.edu 도메인 제한 pre-signup Lambda)
  data/    # AppSync/DynamoDB 스키마 (Post, Comment, ClassEntry, MapPreference) + get-dining-menu 커스텀 쿼리(Lambda)
public/
  brand/logo.svg             # 로고 소스 (PWA 아이콘 생성 파이프라인의 입력)
  brand/og-source.svg        # OG 공유 이미지 소스
  pwa-*.png, maskable-icon-*.png, apple-touch-icon-*.png, favicon.ico   # pwa-assets-generator로 생성됨 (직접 수정 금지)
  og-image.png               # scripts/generate-og-image.mjs로 생성됨 (직접 수정 금지)
scripts/
  generate-og-image.mjs      # OG 이미지 재생성 스크립트 (og-source.svg → og-image.png)
pwa-assets.config.ts          # PWA 아이콘 생성 설정 (@vite-pwa/assets-generator)
```

### 브랜드 자산 갱신하는 법

- **로고를 바꾸면**: `public/brand/logo.svg` 수정 → `pnpm assets:icons` (favicon/apple-touch/PWA 아이콘 전체 재생성, `public/`에 직접 씀) → `src/design-system/Brand/Logo.tsx`의 인라인 path도 동일하게 손으로 맞춰줄 것 (SVG 파일 하나를 자동으로 React 컴포넌트에 동기화하는 장치는 없음).
- **OG 공유 이미지를 바꾸면**: `public/brand/og-source.svg` 수정 → `pnpm assets:og`.
- **로고에 UGA 공식 로고("Power G", arch 워드마크, 마스코트 캐릭터)를 그대로 쓰지 말 것** — 상표로 보호됨. 브랜드 컬러(`brand.primary` #BA0C2F)와 일반적인 불독 모티프 정도만 참고해서 오리지널로 그릴 것.

---

## 페이지별 문서

특정 페이지의 데이터 소스, 알려진 특이사항은 `ai/pages/<Tab>/<Page>.md`에 있다. 페이지 하나를 고칠 때는 그 문서 하나만 읽으면 된다.

| 탭 | 폴더 |
|---|---|
| 커뮤니티 | `ai/pages/Community/` (CommunityPage, BoardPage, PostDetailPage) |
| 시간표 | `ai/pages/Schedule/` (SchedulePage, 친구 시간표 보기는 `FriendSchedulePage` — 같은 문서에 포함) |
| 지도 | `ai/pages/Map/` (MapPage) |
| 학식 | `ai/pages/Dining/` (DiningPage, DiningHallDetailPage) |
| 설정 | `ai/pages/Settings/` (SettingsPage) |

외부 데이터 소스(Passio 버스, Nutrislice 학식, UGA ArcGIS 건물, LibCal 도서관 시간, Rec Sports 체육관 PDF)의 상세 배경과 "홈페이지가 바뀌면 자동 반영되는가"는 README.md의 "외부 데이터 소스" 섹션 참조 — 도메인 지식이라 여기 중복 안 함.

---

## 스타일 규칙 (반드시 준수)

1. **인라인 스타일 금지**: `style={{ ... }}` 사용 금지 (Leaflet DOM 조작처럼 라이브러리가 강제하는 예외 제외). 모든 스타일은 동일 디렉터리의 `*.style.ts`.
2. **동적 스타일은 styled-component props**: `styled.div<{ $active: boolean }>` 형태로. `$` 프리픽스는 DOM에 그대로 전달되지 않는 transient prop 표시.
3. **색상 하드코딩 금지**: 새 색상이 필요하면 `src/design-system/colors.ts`에 먼저 추가하고 import해서 쓸 것. 테마(라이트/다크)에 따라 바뀌어야 하면 `surface.*`(CSS 변수), 항상 고정이면 `brand.*`/`category.*`/`state.*`.
4. **Emotion 패턴**: `export const S = { Name: styled.div\`...\` }` 형태로 export, 사용하는 쪽에서 `S.Name`으로 참조.
5. **폰트**: 본문은 `var(--font-body)`(시스템 폰트), 페이지 제목/브랜드 워드마크 같은 강조 텍스트는 `var(--font-display)`(Oswald, Google Fonts) — `typography.ts`의 `fontFamily` 참조.
6. **spacing/radius/shadow/motion 토큰**: 새 컴포넌트의 여백/모서리/그림자/트랜지션 값은 매직 넘버 대신 `spacing.ts`/`radius.ts`/`shadow.ts`/`motion.ts`에서 가져다 쓸 것. 기존 페이지별 `.style.ts`를 전부 토큰으로 강제 치환하진 않았음 — `Card`/`Button`/`IconButton` 등 공용 프리미티브와 신규 컴포넌트만 적용된 상태.

### 다크모드

`src/app/ThemeContext.tsx`의 `useTheme()`(`theme: 'system'|'light'|'dark'`, `setTheme`)로 제어. `system`이면 `<html>`에 `data-theme` 속성 없음(OS 설정 따라감), `light`/`dark`면 강제 오버라이드. Settings 페이지(`/settings`)에서 사용자가 직접 바꿈. 새 컴포넌트는 항상 `var(--bg)`/`var(--text)` 등 CSS 변수만 쓰면 자동으로 테마 대응됨 — `prefers-color-scheme` 미디어 쿼리를 직접 참조하지 말 것(수동 오버라이드가 씹힘).

### 반응형 브레이크포인트 컨벤션

- **768px**: 모바일 하단 탭 ↔ 태블릿/데스크톱 사이드바 전환 (`AppShell`)
- **1024px**: 태블릿 컴팩트 사이드바(아이콘만) ↔ 데스크톱 풀 사이드바(라벨 포함) 전환. `Page` 컴포넌트의 `max-width`도 이 지점에서 720px → 960px로 확장.
- 새 페이지를 만들 때 폭 관련 레이아웃은 `Page`/`AppShell`이 이미 처리하므로 페이지 자체에서 breakpoint를 새로 정의할 필요는 보통 없음 — 페이지 내부의 가로 스크롤 카드 목록처럼 콘텐츠 특화 레이아웃만 `@media (min-width: 1024px)`로 데스크톱 전용 그리드/레이아웃을 추가.

### 고정 상단바(top bar)를 두지 않음

의도적인 결정: 어떤 페이지도 콘텐츠 위에 항상 떠있는 고정 헤더/툴바를 쓰지 않는다. 페이지 제목(`PageTitle`)은 그냥 스크롤되는 콘텐츠의 일부로 취급. Map 페이지도 예전엔 상단에 항상 떠있는 가로 스크롤 범례 바가 있었지만, 다른 탭들과의 일관성 문제로 제거하고 구글맵 스타일의 우상단 원형 "레이어" 버튼 + 클릭 시 오른쪽에서 슬라이드되는 드로어(`S.LayersButton`/`S.Drawer`, `MapPage.tsx`)로 교체했다 — 지도처럼 컨트롤이 콘텐츠 위에 반드시 떠 있어야 하는 경우엔 이런 "모서리에 떠 있는 작은 버튼 + 필요할 때만 열리는 패널/드로어" 패턴을 쓰고, 화면 폭 전체를 가로지르는 고정 바는 만들지 말 것.

---

## 라우팅 / 코드 스플리팅 / 스플래시

- `src/app/App.tsx`의 모든 페이지는 `React.lazy` + `<Suspense>`로 라우트 단위 코드 스플리팅됨 — 새 페이지를 추가할 때도 `lazy(() => import('...').then((m) => ({ default: m.XxxPage })))` 패턴을 따를 것 (페이지들이 default export가 아니라 named export라 `.then` 래핑이 필요).
- `vite.config.ts`의 `build.rollupOptions.output.manualChunks`가 `leaflet`/`aws-amplify`+`@aws-amplify/ui-react`/`@fortawesome/*`를 각각 별도 벤더 청크로 분리함 — 무거운 라이브러리를 새로 추가하면 여기 추가하는 걸 고려.
- `index.html`의 `#splash`(브랜드 스플래시)는 `src/app/App.tsx`의 `useEffect`가 마운트 후 최소 500ms 뒤 제거함 — 인증 상태 해결과 무관하게 "React가 첫 렌더를 커밋한 시점" 기준.

---

## 데이터 페칭 / 캐싱

- Amplify 데이터를 읽는 페이지는 `client.models.X.list()`/`.get()`을 `useEffect`+`useState`로 직접 부르지 말고 **TanStack Query의 `useQuery`**를 쓸 것 (`src/lib/queryClient.ts`의 싱글턴이 `main.tsx`에서 이미 `QueryClientProvider`로 배선돼 있음). 이유: 라우트 이동 시 페이지 컴포넌트가 언마운트/리마운트되는데, `useEffect` 방식은 매번 새로 fetch해서 탭을 오갈 때마다 로딩이 깜빡이는 문제가 있었음 — `useQuery`는 `staleTime` 동안 캐시를 그대로 재사용해서 이 문제를 해결함.
- **쿼리 키 컨벤션**: `['posts', boardValue]`, `['comments', postId]`, `['diningMenu', hall, mealType]`처럼 `[리소스명, ...식별자]` 형태. 여러 페이지가 같은 데이터를 보면(예: Schedule의 시간표 목록을 Map도 씀) 키를 `src/lib/queryKeys.ts`에 상수로 뽑아서 두 파일이 정확히 같은 키를 참조하게 할 것 — 그래야 한쪽에서 이미 받아온 데이터를 다른 쪽이 재사용함.
- **생성/삭제 후 갱신은 `queryClient.setQueryData`로 캐시를 직접 갱신**(옵티미스틱), `invalidateQueries`로 다시 fetch하지 않음 — 응답이 이미 서버에서 생성된 레코드를 돌려주므로 그걸 그대로 캐시에 append/remove하는 게 더 빠르고 기존 UX와 동일함. 새 mutation을 추가할 때도 이 패턴을 따를 것.
- **Leaflet처럼 훅 기반이 아닌 명령형 코드**(`MapPage.tsx`)에서는 `useQuery` 대신 `queryClient.fetchQuery({ queryKey, queryFn })`(Promise 반환)를 씀 — 캐시 재사용 효과는 동일함. 다만 이건 "한 번 읽어오면 되는 데이터"(건물 목록, 도서관 오늘 시간 등, 지도 마운트 시 스냅샷으로 충분함)에만 맞는 패턴 — 다른 페이지의 변경(Schedule에서 수업 추가/삭제 등)에 지도가 실시간으로 반응해야 하는 데이터는 이 패턴으로 못 잡음(지도를 언마운트 후 재마운트해야만 최신값을 다시 읽으므로). 그런 경우엔 `MapPage.tsx`의 강의동 마커처럼 **컴포넌트 최상단에서 `useQuery`로 반응형 구독** + 그 결과가 바뀔 때마다 `mapActionsRef.current`에 노출된 명령형 함수(`applyAcademicMarkers` 등)를 호출하는 `useEffect`로 연결할 것 — 명령형 Leaflet 코드 자체는 그대로 두고, "언제 다시 그릴지"만 리액트 쪽에서 반응형으로 트리거하는 식.
- **캐싱하면 안 되는 데이터**: 실시간으로 바뀌어야 하는 것(버스 위치 폴링 `fetchUgaBuses`)이나, 의도적으로 항상 라이브 조회하기로 한 것(도서관 오늘 운영시간 `fetchLibraryHoursToday` — README "홈페이지 바뀌면..." 섹션 참조)은 그대로 둘 것.
- `fetchUgaBuildings()`(`ugaBuildings.ts`)는 더 이상 라이브 API 호출이 아님 — `pnpm data:buildings`로 미리 떠서 커밋해둔 정적 JSON(`src/lib/ugaBuildingsData.json`)을 그냥 감싸서 반환함(README "외부 데이터 소스" 참고). `fetchMapPreference()`(`mapPreferences.ts`)는 여전히 TanStack Query 도입 이전부터 쓰던 자체 모듈 레벨 Promise 캐시 방식 그대로 — 이미 해결된 문제라 건드리지 않았음, 새로 비슷한 걸 만들 땐 기존 패턴 대신 TanStack Query를 쓸 것.

---

## i18n 규칙

- 하드코딩 텍스트 금지, 전부 `useTranslation()`의 `t('key')` 사용.
- `en.json`/`ko.json`은 항상 동일한 키 구조 유지.
- 최상위 키 = 페이지/기능 단위: `nav.*`, `community.*`, `schedule.*`, `map.*`, `dining.*`, `settings.*`. 새 최상위 영역을 추가할 때만 새 키를 만들고, 기존 페이지에 텍스트를 추가할 땐 그 페이지의 기존 네임스페이스 아래에 추가.
- 언어 전환은 `useTranslation()`의 `i18n.changeLanguage('ko'|'en')` — `i18next-browser-languagedetector` 기본 옵션이 `caches: ['localStorage']`라 별도 저장 코드 없이 새로고침해도 유지됨 (Settings 페이지 참조).

---

## Amplify 데이터 모델 (요약)

`amplify/data/resource.ts` 기준. 전부 `allow.owner()`(로그인한 본인만 CRUD) 또는 커뮤니티 성격의 모델은 읽기 공개 + 쓰기 소유자 제한 패턴을 따름 — 정확한 인가 규칙은 파일에서 직접 확인.

- `Post` / `Comment` — 커뮤니티 게시판
- `ClassEntry` — 시간표 (과목 코드, 요일, 시간, 장소)
- `MapPreference` — 지도 개인 설정 싱글턴 (내 기숙사 건물). `src/lib/mapPreferences.ts`가 "없으면 생성, 있으면 재사용" 캐싱 래퍼 제공.
