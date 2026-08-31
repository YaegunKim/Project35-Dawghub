# DawgHub

UGA 학생을 위한 커뮤니티 게시판 + 시간표 + 지도 + 학식 조회 앱.

## Stack

- React + TypeScript + Vite (PWA — web/tablet/mobile 반응형)
- `@emotion/styled` (컴포넌트별 `*.style.ts` + `S` export 패턴)
- `react-router-dom`
- `@tanstack/react-query` (서버 데이터 캐싱 — 탭 이동 시 재요청 방지)
- `i18next` / `react-i18next` (en, ko)
- Backend: AWS Amplify Gen2 (Cognito Auth + AppSync/GraphQL + DynamoDB)

## 구조

```
src/
  app/            # 라우팅(React.lazy 코드 스플리팅) + AppShell(반응형 레이아웃: 데스크톱 사이드바 / 모바일 하단 탭) + ThemeContext(다크모드)
  design-system/  # 재사용 빌딩 블록 (Page, Card, Button, Input, Textarea, Select, IconButton, EmptyState, Skeleton, BackLink, Brand/Logo) + colors/typography/spacing/radius/shadow/motion 토큰
  pages/          # community / schedule / map / dining / settings — design-system 컴포넌트를 조합
  lib/            # Amplify data client, Passio(버스) API 클라이언트
  i18n/           # 번역 리소스
amplify/
  auth/           # Cognito (email 로그인, @uga.edu 도메인 제한 pre-signup Lambda)
  data/           # AppSync/DynamoDB 스키마 (Post, Comment, ClassEntry, MapPreference) + getDiningMenu 커스텀 쿼리(Lambda)
  backend.ts
```

## 디자인 시스템

`src/design-system/`의 빌딩 블록으로 페이지를 조합하는 구조:

- **Page / PageTitle** — 모든 페이지 공통 레이아웃(최대 너비 720px, 세로 flex)과 제목
- **Card / CardLink** — 카드형 표면. 페이지별 도메인 컴포넌트(`BoardCard`, `PostCard`, `EntryCard` 등)가 `styled(Card)`로 확장해서 씀
- **Input / Textarea / Select** — 폼 필드 프리미티브
- **Button / IconButton** — 버튼(variant 있음) / 아이콘 전용 버튼
- **EmptyState** — 빈 상태 문구 (로딩은 아래 Skeleton으로 대체 중)
- **Skeleton** — 로딩 중 실제 레이아웃(카드/줄 너비)을 흉내낸 shimmer 블록
- **BackLink** — "← 뒤로가기" 링크

로직이 없는 순수 스타일 컴포넌트는 `Component.style.ts`의 `S.Component`를 그대로 재-export하고, 로직이 필요한 것(Button의 variant, IconButton의 기본 type)만 `.tsx`에서 얇게 감쌈. 페이지별로 반복되는 시각 패턴은 페이지에 두지 않고 이쪽으로 옮기는 게 원칙.

## 브랜드 / 디자인 시스템

- **로고**: `public/brand/logo.svg`가 소스 — UGA 브랜드 컬러(`#BA0C2F` 레드 + 블랙)와 불독 모티프로 그린 오리지널 마크(UGA 공식 "Power G"/마스코트를 그대로 쓰지 않음, 상표 리스크 회피). `src/design-system/Brand/Logo.tsx`가 인앱용 React 버전.
- **PWA 아이콘**: `@vite-pwa/assets-generator`(`pwa-assets.config.ts`)가 `public/brand/logo.svg`에서 favicon/apple-touch/PWA 64·192·512·maskable-512(브랜드 레드 배경 + 30% 세이프존 패딩)를 전부 자동 생성. 로고를 바꾸면 `pnpm assets:icons`로 재생성.
- **OG 공유 이미지**: `public/brand/og-source.svg` → `pnpm assets:og`(`scripts/generate-og-image.mjs`, sharp)로 `public/og-image.png`(1200x630) 생성. `index.html`에 `og:*`/`twitter:*` 메타태그 등록됨.
- **색상/타이포 토큰**: `src/design-system/colors.ts`(brand/surface/state/category), `src/design-system/typography.ts`(fontFamily.body/display, size, weight). 페이지 제목 등 강조 텍스트는 Google Fonts `Oswald`(`--font-display`).
- **spacing/radius/shadow/motion 토큰**: `src/design-system/{spacing,radius,shadow,motion}.ts` — 4px 그리드 여백, radius 스케일(sm/md/lg/pill), 옅은 elevation, 트랜지션 duration/easing. `Card`/`Button`/`IconButton`에 반영됨.
- **다크모드 수동 전환**: `src/app/ThemeContext.tsx`의 `useTheme()` — 설정 탭에서 시스템/라이트/다크 선택, `localStorage` 영속화, `<html data-theme>` 속성으로 적용.
- **반응형**: `AppShell`이 768px(모바일 하단탭 ↔ 사이드바)/1024px(태블릿 컴팩트 ↔ 데스크톱 풀 사이드바) 2단 브레이크포인트, `Page` 컴포넌트가 1024px에서 max-width 720→960px 확장.

## 외부 데이터 소스 (비공식 API)

- **버스 실시간 위치**: [Passio GO](https://uga.passiogo.com) — UGA system id `3994`. CORS가 열려있어서 프론트엔드(`src/lib/passio.ts`)에서 15초마다 직접 폴링. 버스 노선(polyline)/정류장도 같은 API의 `getStops` 응답(`routePoints`, `stops`)에서 가져옴.
- **학식 메뉴**: [Nutrislice](https://uga.nutrislice.com) (`uga.api.nutrislice.com`) — CORS가 막혀있어서 Amplify Lambda(`amplify/data/get-dining-menu`)가 서버에서 대신 호출.
- **건물 위치(도서관/학식당/체육관)**: UGA 건축서비스팀(OUA)이 운영하는 공개 ArcGIS 서비스 — `maps.itos.uga.edu/arcgis/rest/services/OUA/UGA_CampusMap_Base/MapServer/7`. 건물 이름+정확한 좌표+`BuildingUse`(용도) 필드 제공, CORS 열려있어서 프론트엔드(`src/lib/ugaBuildings.ts`)에서 직접 조회. 정적 데이터라 폴링 불필요 — 한 번 캐시해서 재사용.
- **도서관 실시간 운영시간**: UGA 도서관은 Springshare **LibCal**을 씀 (`api3.libcal.com/widget/hours/grid?iid=4280&lid=0`). 각 도서관 개별 `/hours` 페이지(예: `libs.uga.edu/main/hours`)도 전부 이 시스템을 lid만 다르게 embed한 것 — 그래서 그리드 요청 1번으로 9곳(Main/McBay Science/Carnegie/Miller Learning Center/Special Collections/Lamar Dodd 예술도서관/Hugh Hodgson 음악도서관/Aderhold 교육자료실 + Law Library Annex는 이 시스템에 없어 이름만 표시) 다 커버됨. CORS 열려있고 오늘 날짜 기준 실제 시간표를 그대로 내려줌 — `src/lib/libraryHours.ts`에서 매번 라이브로 조회 (캐시 없음, UGA가 시간 바꾸면 바로 반영됨).
- **체육관 운영시간**: [UGA Rec Sports](https://recsports.uga.edu)가 학기마다 손으로 만든 PDF 캘린더로만 배포 (API/피드 없음, URL도 학기마다 바뀜). Fall 2026 PDF를 직접 파싱해서 `src/lib/gymHours.ts`에 정규시간+예외일(홈경기 휴무, 추수감사절/겨울방학 등)로 하드코딩해둠 — **다음 학기엔 새 PDF 보고 수동으로 갱신 필요**. Ramsey Center와 Pound Hall & Wheeler Gym(HSC 캠퍼스, 건물 2개가 시설 1개) 두 시설로 표시.

전부 UGA가 "제3자 개발용"으로 공식 문서화한 API는 아니라서 (각 서비스의 웹/앱이 쓰는 엔드포인트를 그대로 이용), 예고 없이 바뀌거나 막힐 수 있음 — 문제 생기면 이 부분부터 확인.

### "홈페이지 바뀌면 자동으로 감지해서 반영되나?"

데이터 소스마다 답이 달라:

- **도서관**: 감지할 필요 자체가 없음 — LibCal API를 매번 라이브로 조회하니까 UGA가 시간을 바꾸는 즉시 앱에도 반영됨.
- **버스/학식/건물 위치**: 마찬가지로 매번(또는 캐시 후 세션당 1회) 라이브 조회라 소스가 바뀌면 자연히 따라감.
- **체육관**: 진짜 문제가 되는 케이스. UGA가 "이 페이지/PDF가 바뀌었다"고 알려주는 웹훅이나 RSS 같은 건 없음. 할 수 있는 최선은 **주기적으로 다시 확인하는 배치 작업**(예: Amplify Lambda를 매일 EventBridge 스케줄로 돌려서 PDF를 다시 받아 내용 해시를 비교하고, 바뀌었으면 DB에 반영)이지 진짜 "즉시 트리거"는 아님. 게다가 PDF URL 자체가 학기마다 바뀌어서(`RAMFALL26` → `RAMSPRING27`) URL을 예측해서 자동으로 찾아가는 것도 불가능 — 결국 사람이 학기 초에 새 PDF 링크를 알려줘야 함. 지금은 이번 학기(Fall 2026) 스케줄을 직접 파싱해서 하드코딩해뒀고, 자동 갱신은 만들지 않았어.

### 시간표 ↔ 지도 연동

`ClassEntry.location`에 UGA 건물 이름을 입력하면(입력 시 실제 건물 이름 datalist 자동완성 제공), Map 페이지에서 그 건물 좌표에 🎓 마커로 표시됨. 다만 **UGA의 실제 수업별 강의실 배정 데이터는 공개 API가 없음** (Athena는 SSO 로그인 필요, 예전 공개 Banner 8 엔드포인트는 현재 고장남) — 그래서 room/building은 사용자가 직접 입력해야 하고, 그 텍스트를 UGA 공식 건물 데이터와 매칭해서 정확한 좌표를 붙여주는 방식.

## 시작하기

```bash
pnpm install
pnpm dev
```

## 백엔드 (Amplify Gen2)

```bash
pnpm sandbox   # 로컬 개발용 AWS 샌드박스 배포 (amplify_outputs.json 생성)
```

유효한 AWS 자격증명이 필요함 — `aws configure` 또는 AWS Educate 계정으로 발급받은 access key 등록 후 실행. `amplify_outputs.json` 생성 후 `Amplify.configure(outputs)`로 프론트엔드에 연결 예정.

## TODO

- [x] 프론트엔드 뼈대 (라우팅/레이아웃/i18n/PWA)
- [x] Amplify Gen2 백엔드 스캐폴딩 (auth, data 스키마)
- [x] AWS 계정 연결 + `pnpm sandbox`로 첫 배포 완료
- [x] 프론트엔드에 `Amplify.configure` 연결 + 로그인 플로우 (Authenticator, 브랜드 컬러 적용)
- [x] 커뮤니티 게시글 작성/조회 실제 연동 (게시판별 목록 + 작성 폼)
- [x] 시간표 화면 ↔ ClassEntry 모델 연동 (요일별 그룹, 추가/삭제)
- [x] 지도 기본 화면 (Leaflet + OpenStreetMap, UGA 캠퍼스 중심)
- [x] `@uga.edu` 이메일 도메인 가입 제한 (Cognito Pre-signup Lambda, 서버 단 검증)
- [x] 댓글 CRUD 연동 (게시글 상세 페이지)
- [x] 버스 실시간 위치 레이어 (Passio GO, 8초 폴링 + 방향 화살표 + 부드러운 이동 애니메이션)
- [x] 학식 메뉴 데이터 소스 (Nutrislice, Lambda 프록시)
- [x] 학식 메뉴 중복 항목 제거 (Nutrislice 응답에 섹션/스테이션 구분 데이터가 없어 진짜 그룹핑은 불가 — station_id/is_section_title이 항상 비어있음)
- [x] 버스 노선(실제 경로 polyline) + 정류장 레이어 (Passio `getStops` 응답의 `routePoints`/`stops` 사용)
- [x] PWA 아이콘 추가 (192/512/maskable/apple-touch/favicon, 브랜드 컬러 "D" 모노그램)
- [x] 디자인 시스템 정리 (Page/Card/Input/Textarea/Select/IconButton/EmptyState/BackLink로 페이지 전반 리팩터링)
- [x] 지도 타일을 CARTO Voyager로 교체 (더 깔끔한 스타일)
- [x] 지도 전체화면(full-bleed) — Map 탭에서 AppShell 패딩 제거
- [x] 도서관/학식당/체육관 지도 마커 (UGA 공식 ArcGIS 건물 데이터, 카테고리별 아이콘)
- [x] 시간표 위치 ↔ 지도 연동 (건물 이름 datalist 자동완성 + 좌표 매칭, 🎓 마커)
- [x] 지도 범례 오버레이 (버스/도서관/학식당/체육관/내 수업 아이콘 설명) — 클릭하면 해당 레이어 on/off 토글
- [x] 도서관/체육관/학식당 마커를 FontAwesome 아이콘으로 교체 (book-open-reader / dumbbell / utensils)
- [x] 버스 폴링 8초 + 진행 방향 화살표 + 마커 부드러운 이동 애니메이션
- [x] 지도 상단 "Map" 뱃지 제거
- [x] 지도 마커 줌 대응 방식 변경 — 연속적으로 크기 조절하던 방식 대신, 기준 줌(15) 이상에서는 고정 크기 아이콘, 그 아래로 줌아웃하면 작은 점(dot)으로 단순화 (실제 지도 앱들의 일반적인 방식)
- [x] 줌 배율(%) 라벨은 기존 0.6~1.6배 clamp 값을 그대로 재사용 (60%~160%, 아이콘 표시 방식과는 독립적)
- [x] 지도 범례를 항상 한 줄로 유지 (`flex-wrap: nowrap` + 가로 스크롤, 좁은 화면에서도 두 줄로 안 꺾임)
- [x] 도서관 실시간 운영시간 (LibCal API 라이브 조회) — 지도 팝업에 "Today: 7:30am – 2am" 형태로 표시
- [x] 체육관 운영시간 (Ramsey Center + Pound Hall/Wheeler Gym) — Fall 2026 PDF 파싱해서 하드코딩, 정규시간+예외일 반영
- [x] 체육관 마커 중복 수정 — Pound Hall과 Wheeler Hall은 별개 건물이지만 시설은 하나("Pound Hall & Wheeler Gym")라 마커 1개로 통합
- [x] 도서관 마커 3개 → 9개로 확장 (Miller Learning Center, Special Collections, Lamar Dodd 예술도서관, Hugh Hodgson 음악도서관, Aderhold 교육자료실 추가 — 전부 LibCal 그리드 하나로 시간까지 커버)
- [x] 지도 UI 재배치 — 좌하단 캡션 뱃지 제거, 줌 컨트롤을 우하단으로 이동 + 옆에 줌 배율(%) 표시(기준 줌 15 = 100%), 범례를 우상단 박스에서 맨 위 가로 바로 변경
- [ ] 체육관 시간표는 학기 바뀔 때 수동 갱신 필요 (자동 감지 불가 — README "홈페이지 바뀌면..." 섹션 참고)
- [x] 학식당 3곳(Hillside/The Niche/Village Summit) 지도 마커 추가 — GIS에 없어서 좌표 직접 조사해 `src/lib/ugaBuildings.ts`의 `MANUAL_BUILDINGS`에 하드코딩 (Hillside/Niche는 근사값, Village Summit은 Joe Frank Harris Commons 건물과 정확히 일치). 학식당 시간은 [dining.uga.edu](https://dining.uga.edu/locations/dining-commons/) 페이지를 직접 확인해서 `src/lib/diningHours.ts`에 6곳 전부 반영 (실제 페이지와 교차검증 완료)
- [x] 건물 검색 버그 수정 — GIS 데이터에 이름이 공백(`" "`)인 건물이 51개 있었는데 `findBuildingByName`의 fallback 매칭이 그중 하나에 걸려서 존재하지 않는 건물 이름(수동 등록한 학식당 등)이 전부 그 공백-이름 건물로 잘못 매칭되는 문제가 있었음 — `fetchUgaBuildings`에서 이름을 trim 후 빈 문자열 필터링하도록 수정
- [x] 지도 마커 팝업을 실제 React 컴포넌트로 교체 — 이름/오늘 운영시간(도서관·체육관)과 이름/오늘 운영시간/오늘 메뉴(학식당, `DiningHallCard` 스타일 재사용) 박스형 컴포넌트로 변경. Leaflet 팝업에 `createRoot`로 React 트리를 마운트하고 `ResizeObserver`로 비동기 메뉴 로딩 시 팝업 크기 자동 갱신 (`src/pages/map/reactPopup.tsx`, `src/pages/map/popups/`)
- [x] 지도 중앙 고정 "University of Georgia" 마커 제거 (스타일 안 맞는 옛날 기본 핀이었음)
- [x] 내 위치(GPS) 표시 — 좌하단 📍 버튼으로 토글, `navigator.geolocation.watchPosition`으로 실시간 위치 추적 + 정확도 원(accuracy circle) 표시. 바라보는 방향은 `DeviceOrientationEvent`(iOS는 `webkitCompassHeading`, Android는 `deviceorientationabsolute`의 `alpha`)로 나침반 방향을 구해 파란 점 위에 부채꼴(cone)로 표시, 정지 상태에서 나침반이 없으면 GPS `coords.heading`(이동 방향)으로 대체. iOS 나침반 권한은 버튼 클릭(사용자 제스처) 시점에 요청
- [x] 캠퍼스 경계선 표시 — OpenStreetMap relation 21071510(University of Georgia, ODbL)에서 폴리곤 좌표를 가져와 `src/lib/campusBoundary.ts`에 정적으로 저장, 빨간 점선으로 지도에 오버레이 (거의 안 바뀌는 데이터라 매번 fetch하지 않고 빌드에 포함)
- [x] 기숙사/강의동 위치를 점(dot)으로 표시 — UGA ArcGIS 건물 레이어의 `BuildingUse` 필드(`Housing`/`Academics`)로 필터링해서 `L.circleMarker`로 전부 표시 (기숙사 64개, 강의동 318개). 범례에서 개별 on/off 가능
- [x] 기숙사/강의동 점 크기 축소 — 반지름 2px 회색 점으로, 확대해야 잘 보이고 클릭으로 선택하는 정도로만 표시
- [x] "내 기숙사" 설정 — 기숙사 점 클릭 시 팝업에서 설정/해제 가능, `MapPreference` Amplify 모델(owner 스코프)에 저장돼서 계정 기준으로 기기 간 동기화됨. 설정하면 그 점만 주황색으로 크게 강조 표시
- [x] "내 강의동" 자동 강조 — 강의동 점 클릭 시 그 건물에서 하는 내 수업 목록을 보여줌(시간표의 `ClassEntry.location` 매칭). 별도 "내 수업"(🎓) 레이어와 수동 체크리스트는 제거하고, 내 시간표에 있는 건물이면 강의동 점이 자동으로(체크 없이) 보라색으로 크게 강조 표시되도록 하나의 레이어로 통합
- [ ] 수업별 강의실/시간 자동 조회는 불가 (UGA Athena가 SSO 로그인 필요, 대체 공개 엔드포인트 없음) — 사용자가 직접 입력하는 현재 방식이 최선
- [x] 브랜드 리뉴얼 — 플레이스홀더 "D" 모노그램을 UGA 컬러 + 불독 모티프 오리지널 로고로 교체, `@vite-pwa/assets-generator`로 PWA 아이콘 자동 생성 파이프라인 구축, OG 공유 이미지(1200x630) + `og:*`/`twitter:*` 메타태그 추가
- [x] 디자인 시스템 토큰화 — `src/design-system/colors.ts`(brand/surface/state/category)/`typography.ts` 신규, 지도·시간표에 흩어져 있던 매직 헥스 색상을 전부 토큰 참조로 치환. 페이지 제목 등 강조 텍스트에 Google Fonts `Oswald`(`--font-display`) 적용
- [x] 반응형 확장 — `AppShell`에 태블릿 컴팩트 사이드바(768~1024px, 아이콘만) 티어 추가, `Page` 컴포넌트 max-width를 1024px 이상에서 960px로 확장, 학식 카드 섹션을 데스크톱(1024px+)에서 가로 스크롤 대신 그리드로 전환, 지도 팝업에 좁은 화면 오버플로 방지용 max-width 추가
- [x] 개발 문서 하네스 구축 — 루트 `CLAUDE.md`(스택/컨벤션/스타일 규칙) + `ai/pages/<Tab>/<Page>.md` 페이지별 상세 문서(데이터 소스, 알려진 특이사항)
- [x] 설정 탭 신규 — 5번째 탭으로 추가, 계정(이메일/로그아웃), 환경설정(언어 한/영, 다크모드 시스템/라이트/다크 수동 전환), 앱 정보(로고/버전) 구성. 사이드바 하단에만 있던 로그아웃을 여기로 통합 — 모바일 바텀탭에 로그아웃 UI가 없던 문제도 같이 해결됨
- [x] 다크모드 수동 전환 — `ThemeContext`(`src/app/ThemeContext.tsx`)로 `localStorage` 영속화, `<html data-theme>` 속성 기반. OS 설정과 무관하게 라이트/다크 강제 가능, 기본은 시스템 설정 따라감
- [x] 디자인 토큰 확장 — `spacing.ts`/`radius.ts`/`shadow.ts`/`motion.ts` 신규(토스·당근 디자인 시스템 참고), `Card`/`Button`/`IconButton` 공용 컴포넌트에 반영해 elevation·트랜지션 통일
- [x] 내비게이션 리디자인 — 이모지 아이콘을 FontAwesome으로 교체, 활성 탭에 pill 배경 하이라이트 적용
- [x] 스켈레톤 로딩 — `Skeleton` shimmer 컴포넌트 신규, 게시글 목록/게시글 상세/학식 메뉴 미리보기·상세의 "불러오는 중..." 텍스트를 실제 레이아웃을 흉내낸 스켈레톤으로 교체
- [x] 스플래시 화면 — `index.html`에 로고 펄스 애니메이션 스플래시 추가, React 첫 렌더 후 최소 500ms 뒤 페이드아웃
- [x] 성능 최적화 — 라우트별 `React.lazy` 코드 스플리팅 + `leaflet`/`amplify`/`fontawesome` 벤더 청크 분리로 단일 1.36MB 번들을 여러 캐시 가능한 청크로 분리 (Amplify 자체는 여전히 커서 청크 경고는 남아있음 — 인증에 필요해서 지연 로드 불가)
- [x] 탭 이동 시 매번 재요청되던 문제 해결 — TanStack Query(`src/lib/queryClient.ts`) 도입, 게시글 목록/게시글 상세/학식 메뉴/시간표를 `useQuery`로 전환해서 탭을 오가도 캐시된 데이터를 즉시 재사용(로딩 깜빡임 없음). 시간표↔지도처럼 같은 데이터를 보는 페이지는 쿼리 키(`src/lib/queryKeys.ts`)를 공유해서 캐시도 공유. 실시간이어야 하는 버스 위치나 의도적으로 항상 라이브인 도서관 시간은 그대로 캐시 안 함
- [x] 데스크톱/와이드 화면 UI 재검증 — 시간표 캘린더가 사이드바를 가리던 버그(width:100vw 브레이크아웃 훅) 수정 과정에서 캘린더가 다른 페이지처럼 960px로 좁아졌던 걸, 공용 `Page` 대신 자체 `S.Root`(제약 없음)로 바꿔서 사이드바 제외 전체 너비를 다시 쓰도록 함(1920px에서도 텍스트 잘림 없음). "수업 추가하기"/"수업 검색"도 데스크톱에서 어색하게 늘어나 있던 인라인/드로어 방식을 상세보기와 동일한 중앙 모달로 통일. Community/Dining/Settings/게시글 상세는 넓은 화면에서 중앙 정렬된 좁은 컬럼을 유지하는 게 의도된 디자인(가독성 위한 것, 버그 아님)이라 그대로 둠
- [x] 지도 상단 범례를 칩 스타일로 리디자인 — 이모지 대신 FontAwesome 아이콘 통일, 활성/비활성 상태를 색상 테두리+틴트 배경으로 표시. 가로 스크롤 가장자리가 뚝 잘려 보이는 문제는 페이드 마스크로 해결, `justify-content: center`가 넘치는 콘텐츠에서 첫 항목(Bus)을 기본 화면 밖으로 숨기던 버그는 `safe center`로 해결
- [x] 고정 상단바 제거 — Map에만 있던 상단 고정 범례 바가 다른 탭(제목만 스크롤됨)과 일관성이 없다는 피드백으로, 앱 전체에 고정 상단바를 두지 않기로 결정. Map의 카테고리 토글은 구글맵 스타일 우상단 원형 "레이어" 버튼 + 클릭 시 뜨는 팝오버 패널로 교체(칩은 패널 안에서 줄바꿈, 더 이상 가로 스크롤 불필요)
- [x] 지도 레이어 패널 → 드로어+카테고리별 설정 모달로 확장 — "레이어" 버튼을 누르면 오른쪽에서 슬라이드되는 드로어가 열리고, 각 카테고리 행을 누르면 전용 모달이 뜬다. 버스는 운행 중인 노선만/전체 노선/직접 선택(체크리스트) 3가지 모드, 도서관·학식당·체육관은 표시할 건물 체크리스트, 강의동은 내 시간표에 매칭된 건물 후보 중 실제로 보여줄 것만 체크리스트로 선택. 기숙사는 검색 입력으로 내 기숙사를 지정하면 점 대신 집 모양(🏠) 마커로 표시(지도에서 점을 직접 클릭해서 설정하는 기존 방식과 동일한 필드 공유). 저장 위치는 성격에 따라 분리 — 자주 바뀌는 화면 표시 설정(버스/도서관/학식당/체육관)은 `localStorage`(GraphQL mutation 부하 없음), 계정과 함께 다녀야 하는 저빈도 설정(내 기숙사/내 강의동)은 기존 `MapPreference` Amplify 모델 그대로 사용(새 필드/마이그레이션 불필요, `myAcademicBuildings`는 예전에 죽어있던 필드를 다시 살려 씀)
- [x] 지도 버스 정류장도 노선 필터에 연동 — Passio `getStops` 응답의 정류장 항목에 실제로 `routeId`/`routeName`이 붙어있는 걸 확인해서(`src/lib/passio.ts`의 `PassioStop.routeName`), 노선 필터(운행 중/전체/직접 선택)를 고를 때 정류장도 해당 노선 것만 같이 켜지고 꺼지도록 수정 — 예전엔 노선 폴리라인/실시간 버스만 필터링되고 정류장은 항상 전부 떠 있었음
- [x] 학식 상세 페이지 끼니 탭에 시간 서브타이틀 추가 — 아침/점심/저녁 탭 버튼 아래에 그 끼니의 오늘 운영시간을 작게 표시. `dining.uga.edu`의 통합 목록 페이지엔 끼니별 시간이 없어서, 학식당 6곳 각각의 개별 페이지(`/location/<hall>-dining-commons/`)를 다시 확인해서 `src/lib/diningHours.ts`에 `DINING_MEAL_HOURS`로 추가(기존 하루 전체 운영시간 테이블과 합산이 일치하는지 교차검증 완료)
- [x] 학식 메뉴 섹션 고정(핀) 기능 — 상세 페이지에서 섹션 제목 옆 압정 아이콘으로 고정하면 그 섹션이 목록 맨 위로 정렬(`sortSectionsByPinned`, `src/lib/dining.ts`). 학식당/끼니별이 아니라 섹션 이름 기준 전역 저장(`localStorage` 키 `dawghub:dining:pinnedSections`, 기존 학식당 즐겨찾기와 동일한 `useFavorites` 패턴 재사용)이라 한 번 고정하면 어디서든 그 이름의 섹션이 위로 옴. 홈 목록의 카드 미리보기(`DiningHallCard`)도 같은 키를 공유해서 순서에 반영(압정 버튼은 상세 페이지에만 있음)
- [x] 학식 목록 카드의 끼니 라벨 옆에 시간 표시 — "Dinner" 같은 빨간 라벨 옆에 그 끼니의 오늘 시간을 회색으로 작게 병기(`getDiningMealHoursToday` 재사용, 상세 페이지 끼니 탭과 동일한 데이터)
- [x] 학식 탭에 식단/알레르기 아이콘 설명 모달 추가 — 제목 옆 톱니바퀴 버튼을 누르면 식단 5종/알레르기 9종을 아이콘+이름으로 보여주는 모달이 뜸(이후 커밋에서 단순 show/hide 체크박스가 아래의 표시/이것만/제외 필터로 대체됨)
- [x] 식단/알레르기 태그로 메뉴 자체 필터링(표시/이것만/제외) — 태그별 3단계 순환 버튼으로 "이것만"(선택한 태그 전부 가진 아이템만, AND)과 "제외"(선택한 태그 중 하나라도 있으면 제외, OR)를 동시에 조합 가능(예: 비건만 + 땅콩 제외). `filterItemsByTagState`(`src/lib/dining.ts`)가 섹션으로 묶기 전에 아이템 배열 자체를 걸러내서 목록 카드·상세 페이지 양쪽에 반영되고, 상태는 `localStorage`(`dawghub:dining:tagFilters`)에 저장. 필터로 다 걸러지면 "메뉴 없음"과 구분되는 `dining.noMatch` 메시지 표시, 모달에 전체 초기화 버튼 포함
