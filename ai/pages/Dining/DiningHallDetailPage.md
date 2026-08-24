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
- 끼니 목록/기본 선택 끼니(`getCurrentMealType`)와 메뉴 그룹핑(`groupMenuItemsBySection`)은 `src/lib/dining.ts`에 있음 (DiningPage와 공유).

## 알아둘 것

- **메뉴 중복 제거의 한계**: Nutrislice 응답은 섹션 구분 없이 평탄한 `menu_items` 배열이라, Lambda가 같은 이름이 여러 섹션에 걸쳐 나오면 **처음 등장한 것만 남기고 이후는 전부 버림**(`seenNames` Set). 실제로 다른 섹션의 동명 다른 요리여도 하나만 보임 — Nutrislice 데이터 구조 자체의 한계라 프론트에서 고칠 수 없음.
- 섹션 정렬: 조미료/음료/디저트/시리얼/샐러드바 등은 `SECONDARY_SECTION_KEYWORDS`에 걸리면 항상 메인 요리 섹션들 뒤로 밀림 (Lambda에서 정렬).
- **즐겨찾기는 이 페이지에 없음**: 즐겨찾기 추가/삭제 버튼(`dining.favoriteAdd`/`favoriteRemove` 키)은 목록 페이지 `DiningPage`/`DiningHallCard`에만 있고, `localStorage` 키 `dawghub:dining:favorites`(`src/lib/useFavorites.ts`)로 정렬 순서만 바꿈. 상세 페이지는 즐겨찾기 상태를 읽거나 쓰지 않음.
- 끼니 탭 전환(`mealType` 변경)마다 `useEffect`가 `getDiningMenu`를 다시 호출 — 탭 전환 = 새 네트워크 요청, 클라이언트 캐시 없음.
- `VALID_HALLS` 배열이 이 파일 안에 로컬로 하드코딩되어 있고 `src/lib/dining.ts`의 `DINING_HALLS`와 별개 상수 — 학식당 추가/삭제 시 두 곳 다 동기화 필요.
- 메뉴가 없거나 Lambda 호출이 실패하면 둘 다 동일하게 `dining.empty` 빈 상태로 처리됨 (에러와 "오늘 메뉴 없음"을 구분하지 않음).
