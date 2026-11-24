interface ConfirmChipsProps {
  onChoose: (answer: 'yes' | 'no') => void
  disabled: boolean
}

const CHOICES = [
  { answer: 'yes', label: '응' },
  { answer: 'no', label: '아니' },
] as const

// 코치의 확인 질문 아래에 붙는 응/아니 칩
export default function ConfirmChips({ onChoose, disabled }: ConfirmChipsProps) {
  return (
    <div className="flex gap-2 self-start">
      {CHOICES.map(({ answer, label }) => (
        <button
          key={answer}
          type="button"
          className="min-h-11 rounded-xl border border-line px-3 disabled:opacity-40"
          disabled={disabled}
          onClick={() => onChoose(answer)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
