# SchedulePage

`src/pages/schedule/SchedulePage.tsx` (+ `SchedulePage.style.ts`)

## 목적

주간 시간표를 요일×시간 그리드로 보여주고, 과목을 "검색해서 추가"(UGA 공식 개설과목 데이터 기반) 또는 "직접 추가"(수동 입력) 두 가지 방식으로 등록/삭제한다. 검색으로 추가할 때는 담당 교수의 RateMyProfessors 평점/리뷰도 같이 보여준다.

## 데이터 소스

- **`ClassEntry` (Amplify 모델, `amplify/data/resource.ts`)** — 실제 저장되는 시간표 항목. `courseCode`(필수), `title`, `day`(필수, `SUN`~`SAT` 문자열), `startTime`/`endTime`(필수, `"HH:MM"` 24시간제 문자열), `location`(선택, 자유 텍스트). 인가는 `allow.owner()`만 — 본인 것만 CRUD 가능, 커뮤니티처럼 공개 읽기 없음. 한 과목이 여러 요일에 걸치면 요일 수만큼 `ClassEntry` row가 따로 생성됨 (courseCode로 묶어서 관리 — 삭제도 `courseCode` 기준으로 해당 과목의 모든 요일 row를 한번에 지움, `handleDelete`).
- **`searchUgaClasses` 쿼리** (Lambda, `amplify/data/search-uga-classes/handler.ts`) — "수업 추가하기"(검색) 플로우가 호출. `reg.uga.edu`의 "Schedule of Classes" 페이지가 자체적으로 fetch하는 CSV(`apps.reg.uga.edu/soc/{fall,spring,summer}.csv`)를 서버(Lambda)에서 대신 받아 파싱 — 브라우저에서 직접 못 받는 이유는 그 엔드포인트에 CORS 헤더가 없기 때문. 학기(`term`)를 안 넘기면 현재 달 기준으로 fall/summer/spring 자동 판단. 과목코드/제목으로 매칭해서 CRN·교수·요일·시간·건물·room까지 포함한 미팅 목록을 반환 — 즉 검색 플로우는 강의실/시간을 자동으로 채워준다.
- **`getProfessorRating` / `getProfessorReviews` 쿼리** (Lambda) — RateMyProfessors의 비공식 내부 GraphQL API(`ratemyprofessors.com/graphql`)를 서버에서 호출 (공식 문서화된 API 아님, RMP도 CORS 미지원이라 서버 경유 필수). UGA 학교 ID(`schoolID`)로 스코프해서 이름이 정확히 일치하는 교수만 매칭, 동명이인이면 `department` 힌트로 구분. 검색 결과에 나온 교수 전원에 대해 자동으로 평점을 병렬 조회(`fetchProfessorRatings`)하고, 평점 뱃지를 탭하면 그제서야 `getProfessorReviews`로 리뷰 상세를 불러옴(지연 로딩).
- **`fetchUgaBuildings`** (`src/lib/ugaBuildings.ts`) — "직접 추가" 폼의 장소 입력 `<input list>`(datalist) 자동완성에 쓰이는 UGA 실제 건물 이름 목록. Map 페이지와 동일한 소스.

## 알아둘 것

- **README의 "시간표 ↔ 지도 연동" 섹션은 일부 구식**: "수업별 강의실/시간 자동 조회는 불가, UGA Athena는 SSO 필요"라고 되어 있지만, 이후 `searchUgaClasses`(reg.uga.edu SOC CSV 스크레이핑)가 추가되어 **검색 플로우에서는** 건물/room/시간이 자동으로 채워진다. 다만 이건 여전히 비공식 소스(등록 페이지가 위젯용으로 노출하는 CSV)이고 공식 API는 아님 — CSV 구조가 바뀌면(컬럼명 등) 조용히 깨질 수 있음. "직접 추가" 플로우는 여전히 100% 수동 입력이라 이 제약이 그대로 적용됨.
- **위치 텍스트 ↔ 지도 연동**: `ClassEntry.location`에 UGA 건물 이름을 넣으면(수동 입력이든 검색으로 자동 채워지든) Map 페이지가 그 이름을 실제 건물 좌표와 매칭해 🎓 마커/강조 표시를 해준다. 검색 결과의 `building`/`room`은 `[meeting.building, meeting.room].filter(Boolean).join(' ')`로 합쳐서 `location`에 저장되므로, Map 쪽 매칭 로직이 기대하는 "건물 이름으로 시작하는 문자열" 형태를 지금은 검색 플로우가 알아서 만족시켜준다(정확히 건물명만 넣는 수동 입력보다 room 텍스트가 뒤에 붙는 차이는 있음).
- **RMP 인증 헤더는 하드코딩된 고정값**(`Basic dGVzdDp0ZXN0`) — RMP 자체 웹앱이 쓰는 공개 클라이언트 자격증명으로, 비밀값이 아니라 이미 잘 알려진 값. 계정/키 로테이션 문서는 따로 없음.
- **동명이인 교수 매칭**: RMP 쪽은 이름이 정확히 일치하는 후보가 여러 명이면 `department` 문자열 포함관계로만 구분 시도 — 실패하면 그냥 첫 번째 후보를 씀. 완벽한 매칭 보장은 없음.
- **과목 색상은 해시 기반**(`colorForCourse`): `courseCode` 문자열을 31진 해시해서 `category.courses` 팔레트에서 인덱스를 고름 — DB에 색상을 저장하지 않으므로 같은 과목이면 항상 같은 색이 나오지만, 팔레트 크기가 바뀌면 기존 과목들 색이 전부 재배치될 수 있음.
- **그리드 레이아웃**: 하루 안에서 시간이 겹치는 수업은 `layoutDay`가 컬럼을 나눠 나란히 배치(구글 캘린더 스타일). 그리드 세로 범위(`rangeStartHour`/`rangeEndHour`)는 기본 8시~18시이되, 그보다 이르거나 늦은 수업이 있으면 자동으로 확장됨.
- **분반 그룹핑**(`groupSections`/`groupSections`의 상위 `groupByCrn`): 같은 과목의 여러 CRN이 강의(lecture) 미팅을 완전히 공유하고 랩/디스커션만 다르면, 강의 부분은 한 번만 보여주고 다른 부분만 "옵션 선택" 형태로 묶어서 보여준다(대형 개론 과목 UX 개선용, 예: ENGL1102). 옵션이 1개뿐이면 그냥 일반 섹션으로 풀어서 보여줌. 모든 옵션의 교수가 같으면 교수 정보도 그룹 레벨에서 한 번만 표시.
- **삭제는 과목 단위**: 상세 모달의 "수업 삭제"는 `courseCode`가 같은 모든 `ClassEntry`(여러 요일)를 한번에 지운다 — 개별 요일만 지우는 UI는 없음.
- i18n 키는 `schedule.*` (`src/i18n/locales/{ko,en}.json`), 요일 라벨은 `schedule.days.{SUN..SAT}`.
- **이 페이지만 공용 `Page` 컴포넌트를 안 씀**: 캘린더 그리드가 데스크톱에서 사이드바를 제외한 전체 너비를 그대로 써야 해서, `<Page>`(max-width 720/960px 제약) 대신 자체 `S.Root`(제약 없는 flex column)를 쓴다. "수업 추가하기"(직접 추가) 폼과 "수업 검색" 패널도 예전엔 인라인/드로어 방식이었지만 지금은 상세보기 모달과 동일한 `ModalBackdrop`+중앙 정렬 카드 패턴으로 통일돼 있다 — 새 입력 폼을 추가할 때도 이 패턴을 따를 것, 인라인으로 페이지에 끼워넣지 말 것 (넓은 화면에서 입력창이 비정상적으로 길게 늘어나는 문제가 있었음).
