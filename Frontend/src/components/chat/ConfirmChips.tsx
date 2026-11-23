interface ConfirmChipsProps {
  onChoose: (answer: 'yes' | 'no') => void
  disabled: boolean
}

// 코치의 확인 질문 아래에 붙는 응/아니 칩
export default function ConfirmChips({ onChoose, disabled }: ConfirmChipsProps) {
  return (
    <div className="flex gap-2 self-start">
      <button
        type="button"
        className="min-h-11 rounded-xl border border-line px-3 disabled:opacity-40"
        disabled={disabled}
        onClick={() => onChoose('yes')}
      >
        응
      </button>
      <button
        type="button"
        className="min-h-11 rounded-xl border border-line px-3 disabled:opacity-40"
        disabled={disabled}
        onClick={() => onChoose('no')}
      >
        아니
      </button>
    </div>
  )
}
