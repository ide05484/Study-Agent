// Edge Function `plan-generator` 응답 계약
export interface PlanResponse {
  generated: number // 새로 만든 daily_tasks 수
  days: number // 오늘부터 시험 전날까지 일수
  skipped?: 'no_exam_date' | 'exam_passed'
}
