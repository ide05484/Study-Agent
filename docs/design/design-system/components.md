# 컴포넌트

미리보기는 [catalog.html](catalog.html)에서 본다. 코드 위치는 항목마다 적었다.

## Button

주요 동작은 `accent` 바탕 버튼, 보조 동작은 테두리만 있는 버튼으로 쓴다.

- **주요**(`buttonClass`): `accent` 바탕, `on-accent` 글자, 600 굵기. 한 영역에 하나만 둔다(저장, 추가).
- **보조**(`ghostButtonClass`): `bg` 바탕, `border` 테두리, `text` 글자. 취소, 펼치기 전의 "교재 추가".
- 높이 `touch-target`(44px) 이상, 모서리 `radius-xl`, 좌우 `space-4`.
- 비활성은 `opacity: .5`. 저장할 변경이 없거나 진행 중일 때 막는다.
- 호출하는 쪽이 정하는 것: 글자, `type`(`submit`/`button`), 비활성 조건, 넓이(목록 아래 버튼은 꽉 채움).
- 코드: `Frontend/src/components/ui/classes.ts`의 `buttonClass`, `ghostButtonClass`.

## TextField

한 줄 입력, 선택, 여러 줄 입력이 같은 모양을 쓴다.

- `bg` 바탕, `border` 테두리, 모서리 `radius-xl`, 높이 44px 이상, 안쪽 8×12px.
- 자리 표시 글자는 `text-muted`이고 예시를 괄호로 단다: "교재명 (예: 봉투모의고사)".
- 비활성은 `opacity: .6`(로그인 전, 준비 중인 메모).
- 라벨이 화면에 없으면 `aria-label`을 단다.
- 호출하는 쪽이 정하는 것: 라벨, 값, 자리 표시 글자, 입력 형식(`inputmode="numeric"`).
- 코드: `classes.ts`의 `fieldClass`.

## Marker

꼭 봐야 할 숫자에 긋는 형광펜 자국이다.

- 글자 아래쪽 45%에만 `marker`를 칠한다: `linear-gradient(transparent 55%, var(--marker) 55%)`, 좌우 2px.
- 오늘 할 분량, 남은 분량 쪽수에만 쓴다. 한 화면에 여러 군데 긋지 않는다.
- 끝낸 분량에서는 형광펜을 빼고 취소선 + `text-muted`로 바꾼다.
- 코드: `index.css`의 `@utility marker`(`className="marker"`).

## Notice

동작 결과, 오류, 로딩을 알리는 한 줄 문구.

- 결과 안내: `small` `text-muted`, 해당 영역 바로 아래.
- 오류: `small` `danger`, `role="alert"`. 탓하지 않고 다음 행동을 알린다.
- 로딩: "불러오는 중…" `text-muted` 가운데 정렬.
- 배경·아이콘·테두리를 두지 않는다. 토스트는 쓰지 않는다.

## Section

화면 안의 영역을 카드 대신 괘선으로 나눈다.

- 아래쪽 `border` 1px, 위아래 `space-5`. 마지막 영역은 괘선이 없다.
- 제목은 `section-title`(15px, 700), 아래 `space-3`.
- 배경색·그림자·모서리를 주지 않는다.
- 코드: `classes.ts`의 `sectionClass`, `sectionTitleClass`.

## AppHeader

모든 화면 맨 위의 세 칸 헤더: 햄버거 / 제목 / D-day.

- 높이 `header-height`(56px), 아래 `border` 괘선.
- 가운데 제목은 `header-title`. 채팅 화면은 채팅방 날짜("11월 9일 (월)"), 그 외 화면은 화면 이름.
- 오른쪽 D-day는 `accent`, 700, `tabular-nums`. 시험일이 없으면 "D-?"이고 누르면 공부 설정으로 간다. 당일은 "D-DAY".
- 햄버거는 44px 정사각형, `aria-expanded`로 사이드바 열림을 알린다.
- 코드: `components/layout/AppHeader.tsx`.

## Sidebar

햄버거를 누르면 왼쪽에서 밀려 나오는 메뉴.

- 폭은 화면의 80%, 최대 `sidebar-max`(300px). `surface` 바탕, 바깥은 `scrim`으로 덮는다.
- 순서: 현재 공부상태 / 공부 설정 변경 → 괘선 → 채팅방 목록(최신이 위) → 괘선 → 로그아웃(`text-muted`).
- 행은 44px, 모서리 `radius-nav`. 지금 보고 있는 화면·채팅방은 `accent-soft` 바탕 + `accent` 글자 700.
- 오늘 채팅방에는 `accent` 바탕 `오늘` 배지(`caption`, `radius-md`).
- 바깥을 누르거나, 메뉴를 고르거나, Esc를 누르면 닫힌다. 200ms 미끄러짐.
- 코드: `components/layout/Sidebar.tsx`.

## TodayPlan

오늘 채팅방 맨 위에 고정되는 오늘의 분량. 채팅을 가리지 않도록 한 줄(44px)로 접혀 있다.

- 접힘: "오늘의 분량" + 아직 안 한 첫 분량(형광펜) + "외 N개" + 완료/전체 + 꺾쇠.
- 펼침: `과목 / 교재 / 쪽수` 세 칸 목록. 끝낸 분량은 취소선 + `text-muted`, 남은 쪽수는 형광펜. 최대 높이는 화면의 40%, 넘치면 안에서 스크롤.
- 모두 끝내면 "모두 끝냈어요"(`text-muted`). 분량이 없으면 "오늘 배정된 분량이 없어요." + `accent` "교재 추가하기" 링크.
- 지난 채팅방에는 두지 않는다.
- 호출하는 쪽이 주는 것: 오늘 날짜(분량은 훅이 불러온다).
- 코드: `components/chat/TodayPlan.tsx`.

## ChatBubble

코치와 내 메시지를 좌우로 나눠 보인다.

- 코치: 왼쪽, `surface` 바탕. 나: 오른쪽, `accent-soft` 바탕. 글자는 둘 다 `text`.
- 모서리 `radius-2xl`, 꼬리 쪽 아래 모서리만 `radius-sm`. 안쪽 10×14px, 최대 폭 80%, 말풍선 사이 `space-2`.
- 줄바꿈을 그대로 보이고(`pre-wrap`), 긴 단어는 줄을 넘긴다.
- 첫 메시지는 기본 메시지 "오늘 하루도 화이팅! 합격까지 달려봐요".
- 코치 문구는 3~5문장, 근거 있는 칭찬 → 제안 1개 → 다음 행동 질문(coach-tone.md).
- 코드: `pages/ChatPage.tsx`의 `Bubble`.

## ChatComposer

채팅 화면 맨 아래에 고정되는 입력 줄.

- 위 `border` 괘선, 둥근 입력 칸(`radius-full`) + 44px 원형 보내기 버튼(`accent`).
- 자리 표시 글자는 기록 보고 예시: "예) 보건행정 30~70p, 기출 20문제 중 5개 틀림".
- 비어 있거나 보내는 중이면 보내기 버튼을 막는다(`opacity: .4`).
- 지난 채팅방에서는 입력 줄 대신 가운데 정렬 안내 "지난 대화는 볼 수만 있어요."(`small`, `text-muted`).
- 코드: `pages/ChatPage.tsx`의 입력 폼.

## StudyHeatmap

GitHub 잔디처럼 하루를 한 칸으로 보인다.

- 세로 7칸(월~일) × 가로 주 단위, 최근 20주. 칸 사이 3px, 모서리 `radius-xs`, 정사각형.
- 그날 계획 대비 달성률로 `heat-0`~`heat-4`: 100%면 4, 50% 초과 3, 25% 초과 2, 0 초과 1, 기록 없음 0. 계획 없는 날에 기록이 있으면 4.
- 아래 오른쪽에 `적음 ▢▢▢▢▢ 많음` 범례(`caption`, `text-muted`).
- 칸마다 title로 "11월 6일 (금): 계획 달성"처럼 날짜와 단계를 단다. 색만으로 알리지 않는다.
- 코드: `components/dashboard/StudyHeatmap.tsx`.

## StreakCounter

기록이 며칠째 이어지는지 숫자 하나로 크게 보인다.

- 숫자만 `streak-number`(34px, 700, 줄 간격 1), 뒤 문구는 `body` 700: "일 연속 공부 버닝중! 🔥".
- 연속 기록이 없으면 "오늘 기록을 남기면 연속 공부가 시작돼요."
- 오늘 기록이 아직 없으면 어제까지 센다.
- 코드: `pages/DashboardPage.tsx`.

## SubjectProgress

과목마다 가로 진도율 막대 하나. 누르면 그 과목의 남은 교재가 펼쳐진다.

- 행 52px, 네 칸: 과목(600) / 막대 / 퍼센트(`small`, `tabular-nums`) / 꺾쇠.
- 막대는 8px, `border` 바탕에 `accent` 채움, 모서리 `radius-sm`. 과목을 색으로 나누지 않는다.
- 한 번에 한 과목만 펼친다. 펼친 목록은 왼쪽 2px 괘선으로 들여 쓰고, 교재명과 `현재/전체쪽`(`text-muted`).
- 남은 교재가 없으면 "남은 교재가 없어요. 잘하셨어요!", 교재가 없으면 "등록된 교재가 없어요."
- 코드: `components/dashboard/SubjectProgressList.tsx`.

## DatePicker

구글 캘린더의 작은 달력처럼 날짜 칸을 원으로 그리는 날짜 선택.

- 입력 칸: "2026년 11월 27일 (금)" + 오른쪽 달력 아이콘. 비어 있으면 "날짜를 골라 주세요"(`text-muted`).
- 누르면 아래에 달력 창이 열린다: `bg`, `border`, `radius-2xl`, `shadow-popover`(그림자를 쓰는 유일한 곳).
- 머리줄: 왼쪽 "2026년 11월"(600), 오른쪽 이전·다음 화살표(36px 원). 연도·월 목록 화면은 없다.
- 일요일 시작, 6주 고정, 요일 줄은 `caption` `text-muted`. 날짜 칸은 원(`radius-full`).
- 고른 날 `accent` 바탕 + `on-accent`, 오늘 `accent` 글자 700, 앞뒤 달 `text-muted`, 고를 수 없는 날 `opacity: .3`, 올리면 `surface`.
- 날짜를 누르면 닫힌다. 바깥을 누르거나 Esc로도 닫힌다. 값이 있으면 아래 "날짜 지우기".
- 창 폭은 `calendar-max`(288px), 좁은 화면에서 `100vw - 120px`까지 줄어든다.
- 호출하는 쪽이 주는 것: id, 창 이름(`label`), 값(`YYYY-MM-DD` 또는 ''), 고를 수 있는 첫날(`minDate`), 바뀔 때 함수.
- 코드: `components/ui/DatePicker.tsx`(react-calendar, 라이브러리 CSS 없음).

## Disclosure

과목별 공부법처럼 제목 행을 눌러 내용을 펼치는 목록.

- 제목 행 48px, `body-strong`, 오른쪽 꺾쇠(열리면 위로). 행 사이 `border` 괘선.
- 펼친 내용은 `space-2` 간격, 아래 `space-3`.
- 여러 개를 함께 펼칠 수 있다(`<details>`). 한 번에 하나만 열어야 하면 SubjectProgress 방식을 쓴다.
- 코드: `pages/SettingsPage.tsx`의 과목별 공부법.

## KakaoLoginButton

로그인 화면의 유일한 버튼.

- `kakao` 바탕 + `on-kakao` 글자, 높이 48px, 모서리 `radius-xl`, 왼쪽에 말풍선 심볼(18px). 다크 모드에서도 같은 색.
- 누르면 카카오로 넘어가는 동안 비활성.
- 취소·오류로 돌아오면 아래에 `danger` "로그인하지 못했어요. 다시 시도해 주세요."
- 아래 안내는 `small` `text-muted` 가운데 정렬.
- 코드: `pages/LoginPage.tsx`.

## Mascot

코치 캐릭터 합격이를 로그인, 앱 시작(로딩), 404처럼 내용이 적은 화면에 한 마리 넣는다.

- 표정은 화면에 맞춰 고른다: 로그인 `cheer`(140px), 앱 시작·로딩 `think`(160px), 404·오류 `oops`(150px), 그 밖의 안내 `base`.
- 그림은 `assets/Mascot/hapgyeok-<표정>.svg`를 `<img>`로 쓴다. `alt`는 "코치 합격이".
- 그림 아래에는 그 화면의 제목과 할 일을 둔다. 404 예: "길을 잃었어요" → "주소가 바뀌었거나 없는 화면이에요." → 주요 버튼 "오늘 채팅으로 가기".
- 채팅·대시보드·공부 설정 화면, 말풍선 아바타에는 쓰지 않는다.
- 호출하는 쪽이 정하는 것: 표정, 크기, 아래 문구.
- 코드: 아직 없다. SVG는 `Frontend/src/assets/mascot/`에 있다.
