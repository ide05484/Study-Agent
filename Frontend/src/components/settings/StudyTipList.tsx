import { useConfirm } from '../../hooks/useDialog.ts'
import type { StudyTip } from '../../interfaces/studyMethod.ts'
import { toDateKey } from '../../libs/date.ts'
import IconButton from '../ui/IconButton.tsx'

interface StudyTipListProps {
  tips: StudyTip[]
  onRemove: (id: string) => Promise<boolean>
}

// 2026-11-18 → 11/18
function formatTipDate(createdAt: string): string {
  const [, month, day] = toDateKey(createdAt).split('-')
  return `${Number(month)}/${Number(day)}`
}

// 내게 잘 맞은 방법. 내용은 사용자가 쓴 글 그대로 보이고(꾸밈·HTML 해석 없음), 지우기 전에 확인한다
export default function StudyTipList({ tips, onRemove }: StudyTipListProps) {
  const confirm = useConfirm()

  async function handleRemove(tip: StudyTip) {
    const ok = await confirm({
      title: '이 방법을 지울까요?',
      message: tip.content,
      confirmLabel: '지우기',
      tone: 'danger',
    })
    if (ok) await onRemove(tip.id)
  }

  return (
    <section className="grid gap-2">
      <h3 className="text-sm font-semibold">내게 잘 맞은 방법</h3>
      {tips.length === 0 ? (
        <p className="text-sm text-muted">채팅에서 &quot;이렇게 하니 잘 됐어&quot;라고 말해 주면 여기에 모아 둘게요.</p>
      ) : (
        <ul className="divide-y divide-line">
          {tips.map((tip) => (
            <li key={tip.id} className="flex items-center gap-2">
              <p className="min-w-0 flex-1 break-words py-2 text-sm">{tip.content}</p>
              <span className="shrink-0 text-xs text-muted tabular-nums">{formatTipDate(tip.created_at)}</span>
              <IconButton icon="close" label={`${tip.content} 지우기`} onClick={() => void handleRemove(tip)} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
