# MapPage

앱에서 가장 복잡한 화면. Leaflet 지도 하나에 6개의 레이어(각각 표시 여부+카테고리별 설정 모달), GPS/나침반 위치추적, 캠퍼스 경계 표시, 기숙사/수업 마커가 전부 `src/pages/map/MapPage.tsx`(~1200줄) 안에 들어있다. 팝업 4종(`src/pages/map/popups/*.tsx`), React→Leaflet 마운트 유틸(`reactPopup.tsx`), 레이어 설정 localStorage 훅(`src/lib/mapLayerPrefs.ts`)이 보조한다.

## 목적

UGA 캠퍼스 지도 위에 실시간 버스, 도서관/학식당/체육관 위치+운영시간, 기숙사·강의동 위치를 한 화면에 겹쳐 보여주고, 사용자의 현재 위치·내 기숙사·내 시간표상 수업이 있는 건물을 자동으로 강조한다.

## 레이어 구성

우상단 원형 "레이어" 버튼(`S.LayersButton`, FontAwesome layer-group 아이콘)을 누르면 **오른쪽에서 슬라이드되는 드로어**(`S.Drawer`, `drawerOpen` 상태)가 열린다. 드로어 안 6개 행이 각각 `L.LayerGroup`에 대응(`layersRef.current`)하고, 각 행에는 현재 설정 요약(예: "전체 노선", "3개 선택", "설정 안 함")이 서브타이틀로 표시된다. 행을 누르면 그 카테고리 전용 **설정 모달**이 뜬다 — 도서관/학식당/체육관/강의동은 공용 `LayerChecklistModal` 컴포넌트를 재사용하고, 버스와 기숙사는 UI가 달라서 각자 인라인으로 작성돼 있다. 모달 맨 위 "이 레이어 표시" 스위치가 예전 칩의 on/off 토글(`toggleLayer(key)`, `map.addLayer`/`removeLayer`)을 대신한다. (더 예전엔 상단에 항상 떠있는 가로 스크롤 범례 바였으나, 다른 탭엔 고정 상단바가 없어 일관성이 없다는 피드백으로 우상단 버튼+패널로 바뀌었고, 그 패널이 이번에 드로어+모달로 한 단계 더 발전함 — 앱 전체에 고정 상단바 UI 패턴을 두지 않는다는 원칙은 그대로 유지.)

- **bus**: `routesLayer`(노선 polyline) + `stopsLayer`(정류장 원) + `liveBusLayer`(실시간 버스 아이콘, `fa-bus`를 노선 색 원 안에 흰색으로, 진행방향은 원 테두리를 도는 화살표로 별도 표시)를 묶은 그룹. 8초(`BUS_POLL_INTERVAL_MS`)마다 폴링, 위치 변화는 6초(`BUS_ANIMATION_MS`) easing 애니메이션으로 부드럽게 이동(`animateMarkerTo`). 레이어 드로어가 아니라 **왼쪽 위 별도 버스 버튼**(`S.BusButtonRow`/`S.BusPanel`, `useBusLayerPrefs`)으로 뺐음 — 누르면 노선별 색상+알파벳 배지가 세로로 쫙 펼쳐지고, 배지를 눌러 개별 노선 on/off(꺼지면 반투명), 운행 중이 아닌 노선은 빗금 처리 + 목록 맨 아래로 정렬. 배지 옆 all-on/all-off 버튼, 맨 아래 기어 아이콘 → 전체 표시/숨김 + "운영 중인 노선만 표시" + 노선별 체크리스트가 있는 설정 모달. 전부 `localStorage`(`dawghub:map:bus`)에 저장. **정류장도 노선과 같이 필터링됨** — Passio `getStops` 응답의 각 정류장 항목에 `routeId`/`routeName`이 붙어있어(물리적 위치 하나가 노선 여러 개에 걸쳐 여러 항목으로 중복 등록되는 게 아니라 노선 1개에 귀속) `PassioStop.routeName`으로 노출, `applyBusFilter`가 노선 폴리라인과 동일한 `shouldShowRoute(name)` 판정으로 정류장 마커도 같이 켜고 끈다(`stopMarkers` 추적 배열). 정류장 도착 통계용으로 `amplify/data/log-bus-arrivals`가 매분 Passio를 서버에서 직접 폴링해 `BusStopArrival` 테이블에 (버스,정류장) 근접 샘플을 계속 쌓고 있음(아직 초기 단계라 통계로 쓰긴 이름).

## 경로찾기 (Directions)

우상단 레이어 버튼 바로 아래 두 번째 버튼(`S.DirectionsButton`, `faRoute` 아이콘)을 누르면 경로찾기 모드로 들어간다 — 이때 레이어/경로찾기/버스 코너 버튼은 전부 숨겨지고(같은 화면 위쪽 공간을 두고 다투지 않게) 대신 두 개의 도킹된 UI가 뜬다: 화면 최상단에 꽉 차게 붙는 `S.DirectionsTopBar`, 그리고 검색 결과가 나오면 화면 최하단에 붙는 `S.DirectionsBottomSheet`(도보단독/도보+버스 결과 리스트). 지도 자체는 그 사이 공간에서 계속 보이고 조작 가능함. `CLAUDE.md`의 "고정 상단바를 두지 않는다"는 페이지 전역 규칙과 달리, 이건 경로찾기를 켰을 때만 뜨는 일시적 오버레이라 레이어 드로어와 같은 예외 취급.
- **탑바는 자리를 최소한만 차지하도록 압축**: 별도 제목 줄 없이, 출발/도착 입력 두 줄(각각 원/사각형 점으로 FROM/TO 구분 — `S.DirectionsFieldDot`, 라벨 텍스트 없이 placeholder로만 안내해 줄 높이를 줄임) 옆에 스왑·닫기 버튼을 세로로 쌓은 `S.DirectionsActionsColumn`을 둬서 별도 헤더 행 없이 필드 칸 높이 안에서 끼워 맞춤. "경로 찾기" 버튼도 공용 `Button`(고정 40px) 대신 32px짜리 전용 `S.DirectionsSearchButton`을 씀.

- **트립플래닝**: `src/lib/directions.ts`의 `planTrip(origin, destination, routes)`. 도보 단독 옵션은 항상 계산. 도보+버스는 각 노선마다 출발/도착 양쪽 반경(1200m) 안의 가까운 정류장을 **최대 4개씩** 후보로 잡고 그 조합을 전부 계산(정류장 하나만 보고 고르면 노선을 반대 방향으로 거의 한 바퀴 도는 조합을 잡을 수 있어서 — 실제 겪은 버그) → 노선별 최선 조합 중 상위 노선만 실제 도보 API를 불러 최종 후보로 검증. 도보 구간은 OpenRouteService(`amplify/data/get-walking-route`)로 실제 보도 경로를 받아오고, 버스 구간은 `PassioRoute.stops`(정류장 순서, `src/lib/passio.ts`가 Passio의 실제 노선별 정차 순서 데이터로 구성 — `PassioStop.routeName`은 소유 노선 하나만 표시해서 신뢰 불가)의 `polylineIndex`로 실제 GPS 궤적을 슬라이스해서 그림(직선 아님). 소요시간은 Passio에 도착예측 API가 없어서 `거리 ÷ 가정 평균속도 + 고정 대기시간(5분)`으로 추정한 값이고 UI에 "추정치"라고 명시(`busEtaApprox`) — 이 추정 오차를 감안해 도보보다 3분까지 느린 도보+버스 조합도 "비교해볼 만한 옵션"으로 보여줌(무조건 더 빨라야만 노출하진 않음). `BusStopArrival` 데이터가 충분히 쌓이면 이 추정 함수만 교체하면 됨.
- **ORS API 키는 Amplify `secret()`으로 관리** — 이 프로젝트에서 처음 쓰는 시크릿. `amplify/data/get-walking-route/resource.ts`의 `secret('ORS_API_KEY')`, 값은 `npx ampx sandbox secret set ORS_API_KEY --profile dawghub`로 직접 설정해야 함(코드로 자동화 불가). 안 하면 `getWalkingRoute` 쿼리가 401로 실패하고 UI엔 `errorGeneric` 문구만 뜸.
- **팝업 "경로찾기" 버튼**: 버스 정류장/노선 팝업을 제외한 모든 팝업(도서관/학식당/체육관/기숙사/강의동, 공용 `MapDirectionsButton` 컴포넌트)에 있음. 누르면 `mapActionsRef.current.startDirectionsTo(point)`가 그 지점을 도착지로, 현재 GPS 위치를 출발지로 자동 채우고 패널을 열면서 `autoSearchPending` 플래그로 즉시 경로 계산까지 트리거함(구글맵의 "장소 클릭 → Directions" 흐름과 동일).
- **지도 클릭으로 지점 찍기**: `pickingFor` 상태가 origin/destination일 때만 지도 클릭이 핀을 찍음 — 기숙사/강의동/버스정류장 점(`L.circleMarker`)은 기본적으로 클릭이 지도까지 버블링되는 Leaflet 기본값이라, 이 세 곳엔 `bubblingMouseEvents: false`를 명시적으로 줘서 pick 모드 중에도 팝업만 뜨고 엉뚱한 핀이 같이 안 찍히게 막아둠. 안내 문구(`pickHint` + 취소)는 탑바 안에 자리를 차지하는 대신 탑바 바로 아래에 뜨는 토스트(`S.DirectionsPickToast`, `top: 100%`로 탑바 하단에 고정 — 탑바 자체가 `position: absolute`라 이 토스트의 containing block이 됨)로 표시해서 탑바 높이에 영향을 안 줌.
- **지도 위 표시는 별도 레이어**(`directionsLayer`, 레이어 드로어에는 없음) — 출발(A, 초록)/도착(B, 빨강) 핀과 현재 선택된 옵션의 경로만 그림(두 옵션 동시에 그리지 않음, 옵션 전환 시 다시 그림). 패널을 닫으면 검색 상태·핀·경로가 전부 초기화됨.
- **`fitBounds`는 탑바/바텀시트 높이만큼 비대칭 패딩을 줌**: 경로가 그려질 때마다 `topBarRef`/`bottomSheetRef`(둘 다 `useRef`, 각각 `S.DirectionsTopBar`/`S.DirectionsBottomSheet`에 연결)의 `getBoundingClientRect().height`를 읽어서 `paddingTopLeft`/`paddingBottomRight`에 반영 — 안 그러면 경로 일부가 탑바나(특히 위쪽 끝) 결과 리스트가 있는 바텀시트 밑에 가려진 채로 잡힘. 두 참조는 지도 셋업 이펙트(마운트 시 1회 실행)가 클로저로 들고 있지만, ref 객체 자체는 매 렌더마다 동일해서 `.current`는 항상 최신 DOM 높이를 가리킴.
- **트립이 떠 있는 동안 버스 레이어는 그 트립 기준으로만 보임**(`setDirectionsBusFocus`, `refreshBusVisibility`): 도보+버스 옵션을 보는 중이면 실제로 타는 노선의 선(굵은 실선)·정류장·실시간 버스만 정상 표시되고, **다른 모든 노선의 정류장/실시간 버스는 완전히 숨김**(흐리게 아님 — "이 정류장에서도 탈 수 있나?"로 오해할 여지를 아예 없앰), 다른 노선의 선만 참고용으로 얇은 점선으로 남김. 도보단독 옵션을 보는 중이거나 버스 옵션 자체가 없으면 노선/정류장/실시간 버스를 **전부** 숨김(걷기만 하는데 버스가 보일 이유가 없음). 트립이 없을 때(패널을 닫거나 아직 검색 전)는 이 오버라이드가 꺼지고 평소의 레이어 설정(`busPrefs`의 hideAll/disabledRoutes/operatingOnly)이 다시 적용됨.
- **library**: `LIBRARY_BUILDING_NAMES`에 정의된 9개 건물, book-open-reader FontAwesome 아이콘. 팝업은 `MapInfoPopup` + 오늘 운영시간(LibCal). 모달에서 건물별 체크리스트로 표시할 건물 선택(`useFavorites('dawghub:map:library')`, 전부 체크 해제 상태 = "전체 표시").
- **dining**: `DINING_BUILDING_NAMES` 6곳, utensils 아이콘. 팝업은 `MapDiningPopup`(오늘 시간 + `getDiningMenu` Lambda 쿼리로 현재 끼니 메뉴 실시간 조회 + `/dining/:hall` 링크). 체크리스트는 library와 동일한 패턴(`dawghub:map:dining`).
- **gym**: `GYM_BUILDING_NAMES`(Ramsey Center, Pound Hall) 2곳, dumbbell 아이콘. Pound Hall은 팝업 라벨이 "Pound Hall & Wheeler Gym"으로 하드코딩(두 건물이 시설 하나 공유). 체크리스트는 동일 패턴(`dawghub:map:gym`).
- **housing**: `buildingUse === 'Housing'`인 모든 건물을 반경 2px `circleMarker`(점)로 표시. 클릭 시 `MapDormPopup` — "내 기숙사로 설정" 토글(기존 방식 그대로 유지). 모달에서는 체크리스트 대신 검색 입력(datalist 자동완성) + 저장 버튼으로 같은 `myDormBuilding`을 설정할 수 있음 — 지정된 기숙사는 점 대신 집 모양(`faHouse`) 마커로 표시(`HOUSE_ICON`, `refreshDormHighlight`).
- **academics**: 이제 강의동 318개를 전부 표시하지 않고, **내 시간표(`ClassEntry.location`)에 매칭된 건물만** 마커로 생성된다(`entriesByBuilding`). 모달의 체크리스트로 그중 실제로 지도에 보여줄 건물을 고를 수 있음(기본은 전부 표시) — 선택 결과는 `MapPreference.myAcademicBuildings`(Amplify)에 저장. 클릭 시 `MapAcademicPopup` — 그 건물에서 열리는 내 수업 목록(읽기 전용).

공통: `zoomAwareMarkers`에 등록된 아이콘형 마커(도서관/학식/체육관)는 확대(`BASE_ZOOM=15` 이상)하면 full 아이콘, 축소하면 `dotIcon`으로 자동 전환(`updateMarkerDetail`, `zoomend` 이벤트). 도서관/학식당/체육관/강의동/버스노선 마커는 전부 생성 시 레이어에 바로 추가되지 않고 `{name, marker}` 추적 배열에만 담겼다가, `applyXFilter(selected)` 함수가 `layer.hasLayer(marker)` 기준으로 실제 표시 여부를 결정한다(체크리스트 변경 시마다 재호출).

### 저장 방식(계정 vs localStorage)을 나눈 이유

버스 모드/선택 노선, 도서관·학식당·체육관 선택 건물은 자주 바뀔 수 있는 순수 화면 설정이라 `localStorage`에 저장(`dawghub:map:bus/library/dining/gym`) — 매번 GraphQL mutation을 보내면 RPC 부하만 늘고 기기 간 동기화가 꼭 필요하지도 않음. 반대로 내 기숙사·내 강의동 선택은 "내가 누구인지"에 가까운 저빈도 설정이라 기존 `MapPreference` Amplify 모델(`myDormBuilding`, `myAcademicBuildings`)에 그대로 저장 — 필드 자체는 이미 스키마에 있었음(마이그레이션 불필요).

## 데이터 소스

- **버스 실시간 위치/노선/정류장**: Passio GO (`src/lib/passio.ts`, `fetchUgaBuses`/`fetchUgaRoutesAndStops`) — UGA system id `3994`, CORS 열려있어 프론트에서 직접 폴링.
- **건물 좌표 + 용도(BuildingUse)**: UGA ArcGIS(OUA) 스냅샷을 `pnpm data:buildings`(`scripts/fetch-uga-buildings.mjs`)로 떠서 커밋해둔 정적 JSON(`src/lib/ugaBuildingsData.json`) — `fetchUgaBuildings()`(`src/lib/ugaBuildings.ts`)는 이제 라이브 호출이 아니라 이 JSON을 그대로 반환. library/dining/gym/housing/academics 레이어 전부 이걸로 필터링. `MANUAL_BUILDINGS`에 GIS에 없는 신축 건물 3곳(Hillside Dining Commons, The Niche, Village Summit Dining Commons)이 좌표 추정치로 수동 추가돼 있음. 캠퍼스에 건물이 새로 생기면 스크립트 다시 돌려서 커밋.
- **도서관 오늘 운영시간**: LibCal (`src/lib/libraryHours.ts`, library 팝업에서 사용).
- **체육관 오늘 운영시간**: Rec Sports PDF를 수동 파싱해 하드코딩한 `src/lib/gymHours.ts` (학기마다 수동 갱신 필요 — 상세는 README "외부 데이터 소스" 참고).
- **학식 메뉴**: Nutrislice를 프록시하는 `getDiningMenu` Lambda 쿼리 (dining 팝업이 열릴 때마다 실시간 조회).
- **캠퍼스 경계 폴리곤**: `src/lib/campusBoundary.ts` — OpenStreetMap relation 21071510(ODbL)에서 가져온 정적 좌표 배열. 점선 폴리곤(`interactive: false`)으로만 표시, 클릭/상호작용 없음.
- **내 기숙사**: `MapPreference` 모델(`src/lib/mapPreferences.ts`, 싱글턴 "없으면 생성" 캐싱 래퍼) 의 `myDormBuilding` 필드.
- **내 수업이 있는 건물**: `ClassEntry` 모델(`amplify/data/resource.ts`)을 `useQuery(CLASS_ENTRIES_KEY)`로 반응형 구독(Schedule 페이지가 같은 키에 쓰는 캐시를 그대로 재사용) → 그 결과가 바뀔 때마다 `mapActionsRef.current.applyAcademicMarkers`를 호출해 마커를 통째로 다시 그림. `location` 문자열을 `findBuildingByName`으로 ArcGIS 건물명과 매칭해 건물명별 수업 목록(`entriesByBuilding`)을 구성 — Schedule에서 수업을 추가/삭제하면 지도를 다시 열었을 때(또는 이미 열려있는 상태에서 캐시가 갱신되는 순간) 마커가 자동으로 따라감.

## 알아둘 것

- **위치추적은 지도 마운트 시 자동 시작, 나침반 권한만 사용자 제스처가 필요함**: `startTracking`은 지도가 뜨자마자 좌하단 📍 버튼(`LocateControl`)을 자동 클릭한 것처럼 한 번 호출된다(버튼을 눌러 껐다 다시 켤 수도 있음, `stopTracking`). 단 iOS Safari는 `DeviceOrientationEvent.requestPermission()`이 반드시 유저 제스처 핸들러 안에서 호출돼야 권한 팝업이 뜨므로, 자동 시작 경로로는 나침반 방향콘 권한을 못 받아온다 — iOS에서는 사용자가 버튼을 실제로 한 번 눌러야 방향콘이 나타남. 권한이 거부/미지원/미요청 상태면 나침반 방향콘 없이 GPS 좌표만 표시.
- **나침반 방향 소스가 플랫폼마다 다름**: iOS는 `webkitCompassHeading`(비표준, 우선 사용), 그 외 브라우저는 `deviceorientationabsolute`/`deviceorientation`의 `alpha`값을 `(360 - alpha) % 360`으로 변환. 두 리스너 모두 등록해두고 값이 오는 쪽을 씀.
- **기숙사 설정 = 지도 점 클릭 또는 레이어 모달, 둘 다 같은 필드**: 지도에서 기숙사 점을 클릭해 `MapDormPopup`에서 토글하거나, 레이어 드로어 → 기숙사 모달의 검색 입력으로 설정 — 둘 다 `updateMapPreference({ myDormBuilding })`로 Amplify에 저장되는 동일한 값(`mapActionsRef.current.setMyDorm`으로 통일). 설정된 건물은 점 대신 집 모양 마커(`HOUSE_ICON`)로 바뀐다(`refreshDormHighlight`). 한 번에 하나만 설정 가능(다른 기숙사를 새로 지정하면 이전 것은 자동 해제).
- **강의동은 "내 수업이 있는 건물"만 마커로 생성되고, 그중 무엇을 보여줄지는 체크리스트로 선택**: 마커 생성 자체는 자동(`ClassEntry.location` 매칭 결과인 `entriesByBuilding`에 있는 건물만), 화면에 실제로 표시할지는 레이어 드로어 → 강의동 모달의 체크리스트로 고른다(기본은 후보 전부 표시, `MapPreference.myAcademicBuildings`에 저장). 마커가 존재하는 건물은 전부 "내 수업이 있는 건물"이라는 뜻이라 항상 보라색(`MY_ACADEMIC_COLOR`)으로 강조 — 회색/보라색 구분이 따로 없음.
- **점 마커는 반경 2px(`BUILDING_DOT_RADIUS`)로 아주 작음**: 확대하기 전엔 거의 안 보이고 클릭 판정만 되는 수준 — 의도된 동작(코드 주석 "barely visible until you zoom in, just enough to click"). 아이콘형 레이어(도서관/학식/체육관)처럼 줌에 따라 아이콘이 커지는 게 아니라 항상 같은 반경.
- **팝업은 진짜 React 컴포넌트를 렌더링**: `bindReactPopup`(`reactPopup.tsx`)이 detached DOM 노드에 `createRoot().render()`로 마운트해서 `marker.bindPopup()`에 넘긴다. 학식 팝업처럼 팝업이 열린 뒤 비동기로 내용이 바뀌는 경우를 위해 `ResizeObserver`로 컨텐츠 크기 변화를 감지해 `popup.update()`를 호출 — 이 관찰자가 없으면 메뉴 로딩 후 팝업이 내용을 잘라서 보여준다.
- **버스 마커는 ID로 재사용**: 매 폴링마다 마커를 새로 만들지 않고 `busMarkers` Map에 id로 캐싱, 사라진 버스만 레이어에서 제거 — 그래서 위치가 애니메이션으로 이어지고 깜빡임이 없다.
- **지도/구독 정리는 `useEffect` cleanup에서 전부 처리**: `watchId` clear, 두 종류의 orientation 리스너 제거, `setInterval` clear, `map.remove()`까지 — 페이지를 벗어났다 다시 들어와도 중복 폴링/리스너가 남지 않는다.
- **줌 레벨 표시 컨트롤**은 실제 Leaflet 줌 값이 아니라 `iconScaleForZoom()`이 계산한 아이콘 배율(%)을 보여준다 — 디버깅할 때 지도 우하단 숫자를 "줌 레벨"로 착각하지 말 것.
