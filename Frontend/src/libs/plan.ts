import type { PlanResponse } from '../interfaces/plan.ts'

// plan-generator 결과를 사용자 안내 문구로 바꾼다
export function describePlanResult(result: PlanResponse): string {
  if (result.skipped === 'no_exam_date') return '시험일을 설정하면 공부 계획을 나눠 드려요.'
  if (result.skipped === 'exam_passed') return '시험일이 지나 새 계획을 만들지 않았어요.'
  if (result.generated === 0) return '남은 분량이 없어 새 계획이 없어요.'
  return `시험 전날까지 ${result.days}일 계획을 다시 나눴어요.`
}
