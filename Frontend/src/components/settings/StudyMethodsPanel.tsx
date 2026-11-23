import { useStudyMethods } from '../../hooks/useStudyMethods.ts'
import type { StudyMethodTopic } from '../../interfaces/studyMethod.ts'
import { SUBJECT_LABELS, SUBJECTS } from '../../libs/subjects.ts'
import Disclosure from '../ui/Disclosure.tsx'
import Notice from '../ui/Notice.tsx'
import MethodSectionView from './MethodSectionView.tsx'
import StudyTipList from './StudyTipList.tsx'

// 공부 설정 "과목별 공부법" 탭. 국어·영어·공중보건·보건행정, 과목 공통(팁이 있을 때만), 멘탈관리 순으로 접어 둔다
export default function StudyMethodsPanel() {
  const { sections, tips, loading, error, removeTip } = useStudyMethods()

  if (loading) return <Notice>불러오는 중…</Notice>

  // 공부법이 하나도 없는데 error가 있으면 읽기 실패다. 읽은 뒤의 error는 팁 지우기 실패라 목록 위에 보인다
  if (sections.length === 0 && tips.length === 0 && error !== null) {
    return <Notice tone="error">공부법을 불러오지 못했어요. 잠시 후 다시 열어 주세요.</Notice>
  }

  function sectionsOf(topic: StudyMethodTopic) {
    return sections.filter((section) => section.topic === topic)
  }

  const commonTips = tips.filter((tip) => tip.subject === null)
  const mentalSections = sectionsOf('mental')

  return (
    <div className="grid gap-3">
      {error && <Notice tone="error">{error}</Notice>}
      <div className="divide-y divide-line">
        {SUBJECTS.map((subject) => {
          const own = sectionsOf(subject)
          return (
            <Disclosure key={subject} summary={SUBJECT_LABELS[subject]}>
              <div className="grid gap-5 pb-4">
                {own.length === 0 ? (
                  <Notice>공부법을 준비하고 있어요.</Notice>
                ) : (
                  own.map((section) => <MethodSectionView key={section.position} section={section} />)
                )}
                <StudyTipList tips={tips.filter((tip) => tip.subject === subject)} onRemove={removeTip} />
              </div>
            </Disclosure>
          )
        })}
        {commonTips.length > 0 && (
          <Disclosure summary="과목 공통">
            <div className="pb-4">
              <StudyTipList tips={commonTips} onRemove={removeTip} />
            </div>
          </Disclosure>
        )}
        <Disclosure summary="멘탈관리">
          <div className="grid gap-5 pb-4">
            {mentalSections.length === 0 ? (
              <Notice>공부법을 준비하고 있어요.</Notice>
            ) : (
              mentalSections.map((section) => <MethodSectionView key={section.position} section={section} />)
            )}
          </div>
        </Disclosure>
      </div>
    </div>
  )
}
