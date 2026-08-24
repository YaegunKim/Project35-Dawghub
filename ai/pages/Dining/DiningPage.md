# DiningPage (`/dining`)

## 목적

UGA 학식당 6곳을 카드 목록으로 보여주고, 각 카드에 오늘 해당 끼니(아침/점심/저녁)의 메뉴 미리보기를 띄운다. 즐겨찾기한 학식당은 목록 맨 위로 정렬된다.

## 데이터 소스

- **메뉴**: [Nutrislice](https://uga.nutrislice.com)(`uga.api.nutrislice.com`)를 직접 호출하는 게 아니라, CORS가 막혀 있어서 Amplify 커스텀 쿼리 `getDiningMenu`(`amplify/data/resource.ts`, 핸들러는 `amplify/data/get-dining-menu/handler.ts`)가 서버에서 대신 호출해 프록시한다. `DiningHallCard`가 학식당(`hall`)·끼니(`mealType`)별로 `client.queries.getDiningMenu({ hallSlug, mealType })`를 각각 호출 — 카드 6개면 쿼리 6개가 독립적으로 나간다(배칭/캐싱 없음).
- **운영시간**: 실시간 API가 없어 `src/lib/diningHours.ts`에 요일별 시간을 하드코딩(dining.uga.edu 페이지를 손으로 옮겨 적음). 학기 중 UGA가 시간을 바꾸면 수동 갱신 필요.
- **학식당 6곳**(`src/lib/dining.ts`의 `DINING_HALLS`, 카드 표시 순서 기본값): `bolton`, `hillside`, `oglethorpe`, `snelling`, `niche`, `villageSummit`. 이름은 `dining.halls.*`(i18n)로 표시.

## 알아둘 것

- **끼니(mealType) 판정은 진입 시점 1회만**: `DiningPage`가 `useState(() => getCurrentMealType())`로 마운트 시 한 번만 계산(10시 이전 아침/15시 이전 점심/그 외 저녁). 페이지를 계속 띄워둔 채로 시간대가 바뀌어도 재계산 안 됨 — 새로고침해야 반영.
- **즐겨찾기**: `useFavorites('dawghub:dining:favorites')`로 localStorage에 저장 (Amplify 모델 아님, 로그인과 무관). `sortHallsByFavorite`가 즐겨찾기만 앞으로 당기고 나머지는 원래 순서 유지하는 안정 정렬은 아님(단순 boolean 비교 sort).
- **메뉴 중복 항목 제거는 진짜 그룹핑이 아님**: Nutrislice 응답에 station_id/is_section_title이 항상 비어 있어 실제 스테이션 구분이 불가능 — Lambda 쪽에서 이름 기준으로 중복만 제거하고(`seenNames`), 조미료/음료/디저트류 키워드(`SECONDARY_SECTION_KEYWORDS`)를 뒤로 미루는 방식으로 우선순위만 흉내낸 것. `groupMenuItemsBySection`(`src/lib/dining.ts`)는 백엔드가 이미 정렬해 준 순서를 그대로 Map에 담아 섹션별로 묶기만 함.
- **카드 안 메뉴 미리보기는 섹션당 최대 4개**(`MAX_PREVIEW_ITEMS`), 초과분은 "+N개 더"로 표시. 전체 메뉴는 상세 페이지(`/dining/:hall`, `DiningHallDetailPage`)에서 확인.
- **식단/알레르기 태그**(`DietaryTags.tsx`)는 `DIETARY_ICON_URLS`/`ALLERGEN_ICON_URLS`에 매핑이 있는 태그만 렌더링 — Nutrislice가 내려주는 아이콘 슬러그 중 매핑 없는 것(예: `taste-of-home`)은 Lambda 단에서 이미 걸러짐.
- Hillside/Niche/Village Summit의 지도 좌표는 공식 GIS에 없어 수동 조사한 값을 쓰는데, 이건 지도 표시 관련 이슈라 `ai/pages/Map/MapPage.md`에서 다룸 — 이 목록 페이지 자체와는 무관.
