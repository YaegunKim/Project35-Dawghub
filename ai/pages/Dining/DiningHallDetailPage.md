# DiningHallDetailPage

라우트: `/dining/:hallSlug`

## 목적

학식당 한 곳(`hallSlug`)의 오늘 메뉴를 끼니(아침/점심/저녁) 탭으로 전환하며 보여주는 상세 페이지. 각 메뉴 항목에 비건/할랄 등 식이 태그와 알레르기 유발 성분 아이콘을 붙여 보여준다.

## 데이터 소스

- **`client.queries.getDiningMenu({ hallSlug, mealType })`** — `amplify/data/resource.ts`에 정의된 커스텀 쿼리, 실제 구현은 `amplify/data/get-dining-menu/handler.ts` Lambda.
  - 인자는 `hallSlug`, `mealType` 두 개뿐 — **날짜 인자 없음**. Lambda 내부에서 항상 `new Date()` UTC 기준 오늘 날짜로 Nutrislice week API(`uga.api.nutrislice.com/menu/api/weeks/school/{schoolId}/menu-type/{menuTypeId}/{yyyy}/{mm}/{dd}/`)를 호출 → 과거/미래 날짜 조회 불가.
  - `hallSlug` → Nutrislice `schoolId`, `mealType` → `menuTypeId` 매핑 테이블이 Lambda 안에 하드코딩됨 (`NUTRISLICE_SCHOOL_IDS`/`NUTRISLICE_MENU_TYPE_IDS`). 학식당/끼니 종류가 바뀌면 여기부터 수정.
  - Nutrislice의 food-icon slug → 프론트 표시용 키 매핑도 Lambda 안(`DIETARY_SLUG_MAP`/`ALLERGEN_SLUG_MAP`)에 있음 — 매핑 안 된 아이콘(예: `taste-of-home`)은 조용히 버려짐.
- **`getDiningHoursToday(hall)`** (`src/lib/diningHours.ts`) — UGA Dining 공식 사이트를 손으로 옮겨 적은 요일별 정적 테이블. API 아님, 학기/방학 예외 반영 안 됨 → UGA가 시간 바꾸면 수동 갱신 필요 (상세 배경은 README "외부 데이터 소스" 참조).
- **`getDiningMealHoursToday(hall, mealType)`** (`src/lib/diningHours.ts`) — 위와 같은 파일의 `DINING_MEAL_HOURS` 테이블. `getDiningHoursToday`는 학식당별 하루 전체 운영시간(끼니 구분 없음)만 주는데, 이건 그걸 아침/점심/저녁별로 쪼갠 버전 — `/locations/dining-commons/` 통합 목록 페이지가 아니라 학식당 각각의 개별 페이지(`dining.uga.edu/location/<hall>-dining-commons/`)에서 가져온 데이터라 출처가 다름(통합 목록엔 끼니별 시간이 없음). 모든 값이 기존 `DINING_HOURS`의 합산 범위와 일치하는지 대조 검증해서 넣었음. 그 끼니를 안 하는 요일은 `'Closed'`(다른 hours 함수들과 동일하게 i18n 없이 원문 문자열). `DiningHallDetailPage`의 `MealTabs` 각 탭 아래 서브타이틀(`S.MealTabHours`)로 표시.
- **`splitHoursNote(hours)`** (`src/lib/diningHours.ts`) — Niche처럼 시간 문자열 끝에 `"(HSC residents only)"` 같은 괄호 설명이 붙은 경우, 정규식으로 시간과 설명을 분리해서 UI가 두 줄(시간 / 설명)로 따로 렌더링할 수 있게 해주는 순수 문자열 유틸. 괄호가 없으면 `note: null`을 반환하므로 대부분의 학식당/끼니는 그대로 한 줄만 나옴. `getDiningHoursToday`/`getDiningMealHoursToday`가 반환하는 원본 문자열 자체는 안 바꾸고(다른 소비처인 `DiningHallCard`/`MapDiningPopup`은 그대로 한 줄 문자열을 씀), 이 페이지에서만 분리해서 쓴다.
- 끼니 목록/기본 선택 끼니(`getCurrentMealType`)와 메뉴 그룹핑(`groupMenuItemsBySection`)은 `src/lib/dining.ts`에 있음 (DiningPage와 공유).

## 알아둘 것

- **메뉴 중복 제거의 한계**: Nutrislice 응답은 섹션 구분 없이 평탄한 `menu_items` 배열이라, Lambda가 같은 이름이 여러 섹션에 걸쳐 나오면 **처음 등장한 것만 남기고 이후는 전부 버림**(`seenNames` Set). 실제로 다른 섹션의 동명 다른 요리여도 하나만 보임 — Nutrislice 데이터 구조 자체의 한계라 프론트에서 고칠 수 없음.
- 섹션 정렬: 조미료/음료/디저트/시리얼/샐러드바 등은 `SECONDARY_SECTION_KEYWORDS`에 걸리면 항상 메인 요리 섹션들 뒤로 밀림 (Lambda에서 정렬).
- **즐겨찾기는 이 페이지에 없음**: 즐겨찾기 추가/삭제 버튼(`dining.favoriteAdd`/`favoriteRemove` 키)은 목록 페이지 `DiningPage`/`DiningHallCard`에만 있고, `localStorage` 키 `dawghub:dining:favorites`(`src/lib/useFavorites.ts`)로 정렬 순서만 바꿈. 상세 페이지는 즐겨찾기 상태를 읽거나 쓰지 않음.
- **메뉴 섹션 고정(핀)**: 각 섹션 제목 옆 압정 아이콘(`S.PinButton`)으로 섹션을 고정하면 목록 맨 위로 정렬됨(`sortSectionsByPinned`, `src/lib/dining.ts`). 학식당/끼니별이 아니라 **섹션 이름 기준 전역**으로 저장(`useFavorites(PINNED_SECTIONS_KEY)`, `localStorage` 키 `dawghub:dining:pinnedSections`) — 예를 들어 "Entrees"를 한 번 고정하면 어느 학식당·어느 끼니에서 "Entrees" 섹션을 보든 항상 맨 위로 옴. 이 고정 상태는 홈 목록 페이지의 카드 미리보기(`DiningHallCard`)에도 그대로 반영됨(같은 키 공유) — 상세 페이지에만 있는 압정 버튼과 달리 카드 쪽은 순서만 따르고 버튼 UI는 없음.
- **식단/알레르기 태그 필터도 이 페이지에 적용됨**: 필터 설정 버튼/모달(`TagSettingsModal`)은 `DiningPage`에만 있지만, 필터 상태(`dawghub:dining:tagFilters`, `useTagFilters()`)는 전역이라 이 페이지의 `items`에도 똑같이 적용됨 — `filterItemsByTagState`(`src/lib/dining.ts`)가 `groupMenuItemsBySection` 호출 **이전**에 아이템 배열 자체를 걸러내므로, 필터로 사라진 아이템이 속한 섹션은 자동으로 통째로 안 보임(빈 섹션 헤더가 남는 버그 없음). 핀 정렬(`sortSectionsByPinned`)은 이 필터링 다음 단계라 필터된 결과 안에서만 정렬됨. 필터는 표시(Show)/숨김(Hide) 2단만 있고 숨김 태그는 OR로 결합 — 자세한 배경은 [[DiningPage]] 참고.
- 끼니 탭 전환(`mealType` 변경)마다 `useEffect`가 `getDiningMenu`를 다시 호출 — 탭 전환 = 새 네트워크 요청, 클라이언트 캐시 없음.
- `VALID_HALLS` 배열이 이 파일 안에 로컬로 하드코딩되어 있고 `src/lib/dining.ts`의 `DINING_HALLS`와 별개 상수 — 학식당 추가/삭제 시 두 곳 다 동기화 필요.
- 메뉴가 없거나 Lambda 호출이 실패하면 둘 다 동일하게 `dining.empty` 빈 상태로 처리됨 (에러와 "오늘 메뉴 없음"을 구분하지 않음).
