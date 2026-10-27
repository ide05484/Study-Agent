import type { PlanResponse } from '../interfaces/plan.ts'
import { supabase } from '../libs/supabase.ts'

// 교재·시험일이 바뀌면 시험일까지의 daily_tasks를 다시 나눈다
export async function regeneratePlan(): Promise<PlanResponse> {
  const { data, error } = await supabase.functions.invoke<PlanResponse>('plan-generator')
  if (error) throw error
  if (!data) throw new Error('계획 재분배 결과를 받지 못했습니다.')
  return data
}
