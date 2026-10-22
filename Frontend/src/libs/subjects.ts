import type { Subject } from '../interfaces/subject.ts'

export const SUBJECTS: readonly Subject[] = ['korean', 'english', 'public_health', 'health_admin']

export const SUBJECT_LABELS: Record<Subject, string> = {
  korean: '국어',
  english: '영어',
  public_health: '공중보건',
  health_admin: '보건행정',
}
