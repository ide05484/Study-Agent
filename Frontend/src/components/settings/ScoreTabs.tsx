import type { Subject } from '../../interfaces/subject.ts'
import { SUBJECT_LABELS, SUBJECTS } from '../../libs/subjects.ts'
import Tabs, { type TabItem } from '../ui/Tabs.tsx'

// exams: 시험별 블록, 과목: 그 과목 점수 꺾은선
export type ScoreView = 'exams' | Subject

interface ScoreTabsProps {
  value: ScoreView
  onChange: (view: ScoreView) => void
  idPrefix: string // 탭 id는 `${idPrefix}-tab-${view}`, 패널 id는 `${idPrefix}-panel`
}

const ITEMS: TabItem<ScoreView>[] = [
  { value: 'exams', label: '시험별' },
  ...SUBJECTS.map((subject) => ({ value: subject, label: SUBJECT_LABELS[subject] })),
]

// 시험 점수 보기 탭(시험별·과목 4개). 공부 설정의 화면 탭 안에 들어가므로 작은 탭을 쓴다
export default function ScoreTabs({ value, onChange, idPrefix }: ScoreTabsProps) {
  return <Tabs label="점수 보기" items={ITEMS} value={value} onChange={onChange} idPrefix={idPrefix} size="sm" />
}
