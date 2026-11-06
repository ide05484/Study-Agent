import type { Subject } from './subject.ts'

export type GoalKind = 'final' | 'short_term'

export interface Goal {
  id: string
  kind: GoalKind
  title: string
  subject: Subject | null
  target_score: number | null
  due_date: string | null
  achieved_at: string | null
}
