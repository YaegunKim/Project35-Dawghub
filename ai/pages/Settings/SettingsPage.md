# SettingsPage

## 목적

앱 전역 환경설정 탭. 계정 정보 확인·로그아웃, 언어(한/영) 전환, 다크모드 수동 전환, 앱 버전 확인, 버스 데이터 수집 디버그 뷰를 한 화면에서 처리한다.

## 데이터 소스

- **계정 정보**: 자체 데이터 없음 — `App.tsx`가 Amplify `Authenticator`의 render-prop에서 받은 `user.signInDetails?.loginId`(이메일)와 `signOut` 함수를 `userEmail`/`onSignOut` prop으로 그대로 내려줌.
- **언어**: `i18next`. `i18n.changeLanguage('ko'|'en')` 호출 한 줄이 전부 — `i18next-browser-languagedetector`가 기본으로 `caches: ['localStorage']`라 별도 저장 로직 없이 새로고침 후에도 유지됨.
- **테마**: `src/app/ThemeContext.tsx`의 `useTheme()`. `localStorage` 키 `dawghub:theme`에 `'system'|'light'|'dark'` 저장, `<html data-theme="...">` 속성으로 반영. 실제 색상 값은 `src/design-system/GlobalStyles.tsx`가 `data-theme` 속성 유무에 따라 CSS 변수를 오버라이드하는 방식.
- **버전**: `__APP_VERSION__` — `vite.config.ts`의 `define`이 `package.json`의 `version` 필드를 빌드 타임에 문자열로 주입 (런타임 fetch 아님, 빌드해야 갱신됨).
- **버스 데이터 디버그**(`BusDataDebugPanel.tsx`): `log-bus-arrivals` Lambda가 매분 기록하는 `BusStopArrival` 테이블(Map 페이지 문서의 "버스 실시간 위치/노선/정류장" 참고)의 누적 상태를 개발/디버그 목적으로 보여줌 — 총 기록 수, 수집된 노선/정류장 개수, 가장 이르고 늦은 샘플 시각, 노선별 기록 수 표. 기본은 접힌 상태고 펼칠 때만 `useQuery({enabled: expanded, ...})`로 조회(테이블이 계속 커지므로 방문할 때마다 자동으로 긁지 않음), `client.models.BusStopArrival.list()`의 `nextToken`을 끝까지 따라가며 전체 페이지를 합산.

## 알아둘 것

- **사이드바 하단 계정 블록은 삭제됨**: 이전엔 데스크톱 사이드바 하단에 이메일+로그아웃이 있었고 모바일 바텀탭엔 로그아웃 UI가 아예 없었음. 지금은 이 페이지가 유일한 계정/로그아웃 창구 — `AppShell.tsx`에서 `Account`/`AccountEmail` 관련 코드를 완전히 제거했으므로 되살리지 말 것.
- **테마 우선순위**: `system`(속성 없음, OS 미디어쿼리 따라감) → `light`/`dark`(강제 오버라이드, OS 설정 무시). `GlobalStyles.tsx`의 다크모드 미디어쿼리는 `:root:not([data-theme='light'])`로 감싸져 있어서 `light` 강제 시에도 절대 안 씹히도록 되어 있음 — 새 테마 값을 추가하려면 이 파일의 오버라이드 블록 구조를 그대로 따라갈 것.
- **언어 세그먼트의 활성 상태 판정**은 `i18n.language === 'ko' | 'en'` 단순 비교 — `supportedLngs: ['en', 'ko']`가 `i18n/index.ts`에 설정돼 있어 브라우저가 `ko-KR` 등을 보내도 i18next가 알아서 `ko`로 정규화해줌.
- 이 페이지는 `React.lazy`로 로드되는 라우트 중 하나 (`App.tsx` 참조) — 무거운 의존성을 새로 추가해도 다른 탭 초기 로드에 영향 없음.
