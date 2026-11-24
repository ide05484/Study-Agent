import type { Subject } from './subject.ts'

// DB study_methods.topic 중 화면에서 읽는 값(time은 코치 전용이라 제외)
export type StudyMethodTopic = Subject | 'mental'

export interface StudyMethodPair {
  label: string
  text: string
}

interface StudyMethodSectionBase {
  topic: StudyMethodTopic
  position: number
  heading: string
}

// 글 안의 **굵게**, ==형광펜==은 libs/marks.ts가 읽는다
export type StudyMethodSection =
  | (StudyMethodSectionBase & { kind: 'list'; items: string[] })
  | (StudyMethodSectionBase & { kind: 'pairs'; items: StudyMethodPair[] })

export interface StudyTip {
  id: string
  subject: Subject | null
  content: string
  created_at: string
}
