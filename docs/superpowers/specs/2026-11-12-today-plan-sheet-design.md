# 오늘의 분량 시트와 완료 체크 설계 (묶음 B)

- 날짜: 2026-11-12
- 상태: 설계 정리(구현 계획 전)
- 관련: [로드맵](../plans/2026-10-27-roadmap.md) 묶음 B, [채팅 연결 계획](../plans/2026-10-27-chat-connection.md) 요구사항 C, [묶음 A 설계](2026-11-12-book-units-and-targets-design.md)

## 배경

지금 채팅방 맨 위의 오늘의 분량은 한 줄로 접힌 막대이고, 펼쳐도 `text-sm` 목록이라 폰에서 읽기 어렵다(사용자: "글씨가 너무 작아서 폰에서 일일히 읽기 힘들고 하나도 눈에 들어오지 않음"). 끝낸 분량을 표시할 방법도 없어서 `daily_tasks.status`는 늘 `pending`이다.

## 사용자 요구

1. 오늘의 분량은 입력창 위에 떠 있는 버튼으로 두고, 누르면 화면에 크게 보이는 창으로 연다.
2. 창의 목록 왼쪽에 체크박스를 두고, 끝낸 분량을 체크한다.
3. (요구사항 C, 채팅 연결에서) 채팅으로 "나 ~ 완료했어"라고 보내도 반영한다. 체크와 같은 반영 함수를 쓴다.

## 정한 것 (사용자 결정)

| 질문 | 결정 |
|---|---|
| 하루가 지나도 체크되지 않은 분량 | 그날 처음 앱을 열 때 자동으로 계획을 다시 나눈다 |
| 창 모양 | 아래에서 올라오는 시트(폰 높이 85%까지) |

## 화면

### 떠 있는 버튼

- 오늘 채팅방에만 둔다. 지난 채팅방(읽기 전용)에는 없다.
- 입력 줄 바로 위 오른쪽에 둥근 버튼(높이 44px 이상, `rounded-full`, `bg-surface border-line`). 메시지 목록에는 버튼 높이만큼 아래 여백을 줘서 마지막 말풍선을 가리지 않는다.
- 문구:
  - 남은 분량이 있으면 `오늘의 분량 1/4` + `▸`(끝낸 수/전체 수, `tabular-nums`)
  - 다 끝내면 `오늘의 분량 다 했어요 ✓`
  - 배정된 분량이 없으면 `오늘 배정된 분량이 없어요`
  - 불러오지 못하면 `오늘의 분량을 불러오지 못했어요`(누르면 다시 불러온다)
- 지금의 위쪽 한 줄 막대(`TodayPlan`)는 없앤다.

### 시트

- 공용 `Modal`에 `variant="sheet"`를 더한다. 폰에서는 아래에 붙어 올라오고 최대 높이 85dvh, 위 모서리만 둥글다. 데스크톱에서는 앱 칸 폭(최대 480px)에 맞춰 아래에 붙는다. 목록이 길면 시트 안에서 스크롤한다.
- 제목 줄: `오늘의 분량` + `1/4`(muted), 오른쪽 끝 닫기 `IconButton`(✕).
- 닫기: ✕, Esc, 바깥(`bg-scrim`) 누르기. 입력 칸이 없으므로 바깥을 눌러 닫아도 잃을 것이 없다(가운데 창은 지금처럼 바깥으로 닫히지 않는다).
- 한 줄(56px 이상, 줄 전체가 `<label>`):
  - 왼쪽 체크박스(24px, `accent-accent`, 진짜 `<input type="checkbox">`)
  - 가운데 위: 과목(`text-sm text-muted`), 아래: 교재명(본문 16px)
  - 오른쪽: 범위(`rangeLabel`, 2회독 이상 목표면 `2회독 12–14회`). 안 했으면 굵게 + 형광펜(`marker`), 체크하면 `text-muted line-through`
  - 과목 순서(국어 → 영어 → 공중보건 → 보건행정)
- 분량이 없으면 안내 문구와 `교재 추가하기` 링크(`/settings`).
- 체크하면 화면은 바로 바꾸고(낙관적 갱신) 저장한다. 실패하면 되돌리고 시트 위쪽에 `저장하지 못했어요. 다시 눌러 주세요.`(`Notice tone="error"`).
- 저장하는 동안 같은 줄은 다시 누를 수 없다(다른 줄은 누를 수 있다).
- `partial`(채팅으로 일부만 했다고 보고한 분량)은 체크박스가 비어 있고 범위 옆에 `일부`를 붙인다. 체크하면 `done`이 된다.

## 체크가 하는 일

### DB 함수 `set_task_done(p_task_id uuid, p_done boolean) returns void`

`security invoker`, `set search_path = ''`, `authenticated`에만 실행 권한. `replace_daily_tasks`와 같은 사용자별 advisory 잠금을 잡아 재분배와 겹치지 않게 한다. 한 트랜잭션에서:

1. 분량과 그 교재를 읽는다(RLS로 자기 것만 보인다). 없으면 오류(재분배로 지워진 분량 등).
2. 완료 분량으로 비교한다. `완료 = (current_round − 1) × total_units + current_unit`, 분량 끝 `E = (round − 1) × total_units + end_unit`, 분량 앞 `S = (round − 1) × total_units + start_unit − 1`.
   - 체크(`p_done = true`): 새 완료 = `max(완료, E)`. 진도는 뒤로 가지 않는다.
   - 해제(`p_done = false`): 새 완료 = `min(완료, S)`. 진도를 그 분량 바로 앞으로 되돌린다.
3. 새 완료를 진도로 바꿔 `books`에 저장한다. 0이면 `1회독째 0`, 아니면 `current_round = ceil(새 완료 / total_units)`, `current_unit = 새 완료 − (current_round − 1) × total_units`(회독을 막 끝내면 그 회독의 `total_units`로 둔다. 지금 진도 규칙과 같다). 목표 회독 × 총량을 넘지 않는다.
4. 같은 교재의 **같은 날짜** 분량 상태를 새 완료로 다시 매긴다: `E ≤ 새 완료`이면 `done`, 아니고 `done`이었으면 `pending`, 그 밖(`partial`·`skipped`·`pending`)은 그대로.
   - 예: 회독 경계 날 `1회독 59–60회`·`2회독 1–2회` 두 줄에서 뒤 줄을 체크하면 앞 줄도 `done`이 된다. 앞 줄을 해제하면 진도가 1회독 58로 돌아가 뒤 줄도 `pending`이 된다.

요구사항 C의 채팅 반영도 이 함수를 쓴다(보고한 범위에 맞는 분량이 있으면 그 분량으로 부르고, 계획 밖 공부는 진도 수정 + 재분배로 처리한다. 자세한 규칙은 채팅 연결 계획에서 정한다).

체크만으로는 계획을 다시 나누지 않는다. 계획대로 끝냈다면 내일 분량이 이미 그 다음부터 잡혀 있기 때문이다.

### 고른 방법과 버린 방법

- **고름: DB 함수 하나.** 분량 상태와 진도가 함께 바뀌거나 함께 안 바뀐다. 채팅(Edge Function)도 사용자 토큰으로 같은 함수를 부른다.
- 버림: 화면에서 `daily_tasks`와 `books`를 따로 update. 하나만 저장되고 끊길 수 있고 채팅 쪽에 같은 계산을 또 만들어야 한다.
- 버림: 별도 Edge Function. 첫 호출(콜드 스타트)이 느려 체크 반응이 늦다.

## 못 끝낸 분량 (앱을 열 때 재분배)

- `AppLayout`이 앱을 열 때 한 번(`useOverdueTargets`처럼 `checkedRef`), 시험일이 있으면 "오늘 이전 날짜의 `pending` 분량이 있는지"를 한 줄만 조회한다. 있으면 뒤에서 `plan-generator`를 부른다. 실패하면 조용히 넘기고 다음에 앱을 열 때 다시 한다.
- 재분배가 끝나면 채팅의 오늘의 분량을 다시 불러온다(오늘 분량이 바뀌었으므로).
- `replace_daily_tasks`를 새 마이그레이션으로 바꿔, 지우고 넣기 전에 **`p_from` 이전 날짜의 `pending`을 `skipped`로** 바꾼다(못 해서 뒤로 넘긴 분량). 그래서 다음에 앱을 열 때 같은 분량으로 다시 재분배하지 않는다. 진도가 그대로이므로 못 한 분량은 남은 날에 고르게 퍼진다(마지막 주 상한 규칙 그대로).
- 목표일 지남 모달과 같이 돌아도 된다. 두 재분배는 DB 잠금으로 차례로 돈다.

## 오늘 이미 끝낸 분량과 재분배

체크한 뒤 같은 날 다른 이유(교재 수정, 시험일 변경)로 재분배하면, 지금 `plan-generator`는 오늘부터 다시 나누므로 오늘 끝낸 교재에 오늘 분량이 또 생긴다. 그래서 **오늘 날짜에 `done`·`partial` 분량이 있는 교재는 내일부터 나눈다**(그 교재의 하루 수와 목표일 날짜 수를 하루씩 줄여 계산하고 날짜를 하루 민다). 다른 교재는 지금처럼 오늘부터 나눈다. `_shared/plan.ts`에 테스트를 더한다.

## 바뀌는 곳

- Backend
  - 새 마이그레이션: `set_task_done`, `replace_daily_tasks`(지난 `pending` → `skipped`)
  - `plan-generator`: 오늘 끝낸 교재는 내일부터. `_shared/plan.ts` 테스트
- Frontend
  - `components/ui/Modal.tsx`: `variant="sheet"`
  - `components/chat/TodayPlanButton.tsx`(버튼), `components/chat/TodayPlanSheet.tsx`(시트). `TodayPlan.tsx`는 지운다
  - `api/study.ts`: `setTaskDone(taskId, done)`(RPC), 지난 `pending` 분량이 있는지 조회
  - `hooks/useTodayTasks.ts`: 다시 불러오기, 체크(낙관적 갱신·되돌리기)
  - `hooks/useCarryOver.ts`(앱 열 때 재분배), `AppLayout`
  - `pages/ChatPage.tsx`, `pages/UiCatalogPage.tsx`(시트 예시)
- 문서: DESIGN.md(채팅 화면 와이어프레임, Modal 시트), SERVICE_FLOW.md(4·5장 체크와 이월), 채팅 연결 계획 요구사항 C(같은 함수 이름), 로드맵

## 확인 방법

- `npm test`: `_shared/plan.ts`의 "오늘 끝낸 교재는 내일부터" 테스트
- 개발 DB(`db query --linked`): `set_task_done`의 체크·해제·회독 경계 두 줄·이미 더 나간 진도·다른 사용자 분량(RLS로 없음), `replace_daily_tasks`의 `skipped` 처리
- Frontend `build`·`lint`, 브라우저(360px·데스크톱): 버튼 위치와 말풍선 가림, 시트 열고 닫기(✕·Esc·바깥), 체크 즉시 반영, 새로고침 뒤 유지, 설정 화면 진도가 따라 바뀌는지

## 범위 밖

- 채팅으로 완료 보고(요구사항 C), 시험 한 달 전 응원(묶음 D)
- 지난날 분량을 시트에서 체크하기(지난날 분량은 앱을 열 때 `skipped`로 넘어간다)
- `partial`을 화면에서 고르기(채팅으로만)
