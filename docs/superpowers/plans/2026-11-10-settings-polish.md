# 공부 설정 다듬기 2차 (속도·추가 버튼·점수 추이) Implementation Plan

> 상태: **진행** (2026-11-12, 브랜치 `feature/study_screen_and_data`. 2026-11-10 사용자 결정으로 `feature/study_Mockdata` PR 뒤로 미뤘다.) 사용자 요청과 결정은 [History](../../../History/2026-11-10-공부-데이터-채우기.md) "공부 설정 다듬기 2차".

**Goal:** 진도 수정·교재 삭제가 기다림 없이 끝나고, 추가 버튼이 제목 줄로 올라가며, 시험 점수를 과목별 꺾은선으로 볼 수 있다.

**측정한 현재 상태 (2026-11-10, 함수 로그):** `plan-generator` POST 실행 1.6~3.1초, 깨어나는 첫 호출의 OPTIONS 최대 2.7초. 함수는 서울(ap-northeast-2), DB는 싱가포르(ap-southeast-1)라 DB 왕복마다 지연이 쌓인다. 한 번에 계획 약 1,800줄을 지우고 500줄씩 4번 순서대로 넣는다. 화면은 이 재분배가 끝날 때까지 폼·메뉴를 닫지 않는다.

## 정한 것 (사용자, 2026-11-10)

| 항목 | 결정 |
|---|---|
| 속도 | 화면과 서버 둘 다. 화면은 저장되면 바로 닫고 재분배는 뒤에서, 서버는 지우기·넣기를 DB 함수 하나로 |
| 점수 그래프 | 시험 점수 영역 위에 탭 5개 `[시험별] [국어] [영어] [공중보건] [보건행정]`. 시험별은 지금 블록, 과목 탭은 응시일 순 꺾은선 |
| 추가 버튼 | 두 영역 모두 제목 줄 오른쪽에 `+`. 교재는 그 옆에 ⋮(삭제). 누르면 폼이 제목 바로 아래에 열린다 |

## Global Constraints

- CONVENTIONS.md, DESIGN.md 토큰·클래스 규칙(전체 이름 매핑), 화면 문구 해요체.
- ☁️ 마이그레이션 반영과 함수 배포는 개발 프로젝트(`ishtebcswgyagbbaakpx`)에만. 이미 배포된 마이그레이션은 고치지 않는다.
- 새 차트 라이브러리를 넣지 않는다(SVG 직접). 과목은 색이 아니라 탭(라벨)으로 구분한다.
- push 안 함. 작업 단위마다 경로 지정 커밋, History 기록.

## Review Focus

1. 재분배가 겹칠 때(진도 수정을 빠르게 두 번) 같은 계획이 두 줄 생기지 않는다.
2. 재분배가 뒤에서 실패하면 저장은 유지되고 오류 안내가 보인다.
3. 점수가 1건뿐이거나 그 과목 점수가 없는 탭에서 그래프가 깨지지 않는다(안내 문구).
4. 시험이 여러 건이어도 x축 라벨이 겹치지 않는다(480px).
5. `+`를 눌러 연 폼과 선택 삭제 모드가 동시에 열리지 않는다.

---

### Task 1: 계획 교체를 DB 함수 하나로 (Native, ☁️)

- Create: `Backend/supabase/migrations/<타임스탬프>_replace_daily_tasks.sql` — `public.replace_daily_tasks(p_from date, p_tasks jsonb) returns integer`. `security invoker`(RLS 그대로), `set search_path = ''`. 한 트랜잭션에서 `pg_advisory_xact_lock`(사용자별)으로 겹침을 막고, `auth.uid()`의 `task_date >= p_from`·`pending` 계획을 지운 뒤 `p_tasks`(`book_id, task_date, round, start_page, end_page`)를 넣고 넣은 줄 수를 돌려준다. `anon`·`public` 실행 권한 회수, `authenticated`만 허용.
- Modify: `plan-generator/index.ts` — 삭제·청크 insert 대신 `rpc('replace_daily_tasks')` 한 번. 응답(`PlanResponse`)은 그대로.
- ☁️ MCP로 반영(이력 버전을 파일 타임스탬프로), 보안 어드바이저 확인, 타입 재생성, 함수 배포. 실행 시간을 로그로 다시 잰다.

### Task 2: 화면은 저장 뒤 바로 닫기, 재분배는 뒤에서 (Native)

- `useBooks`: `add`·`updateProgress`·`remove`는 저장이 끝나면 바로 `true`를 돌려주고, 재분배는 기다리지 않고 시작한다. 진행 중이면 `notice`에 `계획을 다시 나누는 중이에요…`. 재분배가 진행 중일 때 또 요청되면 끝난 뒤 한 번만 더 돌린다(합치기).
- 실패 문구는 지금과 같다(`교재는 저장했지만 계획을 다시 나누지 못했어요.`).

### Task 3: 제목 줄 `+` 버튼 (Native)

- Create: `components/ui/IconButton.tsx`(44px, `label`, `icon`: `plus`|`kebab`) — Menu의 ⋮ 버튼도 이것으로 바꾼다(DESIGN.md "IconButton 후보" 정리). `/ui`에 넣는다.
- `SettingsPage`: 교재 제목 줄 `[+][⋮]`, 시험 점수 제목 줄 `[+]`. 큰 `교재 추가`·`점수 추가` 버튼을 지우고, 폼은 제목 바로 아래에 연다. `+`가 열려 있으면 다시 누르면 닫힌다. 선택 삭제 모드에서는 `+`를 숨긴다.

### Task 4: 시험 점수 탭과 과목별 꺾은선 (Native, dataviz 스킬을 먼저 읽는다)

- `SettingsPage` 시험 점수 영역 위에 탭(`role="tablist"`, 44px). 기본 `시험별`.
- Create: `components/settings/ScoreTrendChart.tsx` — 그 과목 점수가 있는 시험만 응시일 오래된 순. y축 0~100(눈금 0·50·100), x축 응시일(`26.10.9` 형식, 많으면 첫·끝만), 선과 점은 `accent`, 점 위에 점수, 실제 시험은 속이 빈 점, 모의고사는 채운 점, 아래 범례. 점수가 없으면 `이 과목 점수가 아직 없어요.`, 1건이면 점 하나와 안내 `점수가 쌓이면 변화가 선으로 보여요.`
- DESIGN.md "3. 공부 설정 변경" 와이어프레임·설명 갱신. 대시보드 점수 추이(3단계)는 이 차트를 다시 쓸 수 있다고 로드맵에 한 줄.

### 끝

- task-reviewer + code-reviewer에 네 Task를 합친 diff를 동시에 보낸다. History 기록. 사용자 브라우저 확인.
