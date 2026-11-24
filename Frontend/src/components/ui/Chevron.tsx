interface ChevronProps {
  direction?: 'down' | 'up' | 'right'
  className?: string
}

const DIRECTION_CLASSES = {
  down: 'rotate-45',
  up: '-rotate-135',
  right: '-rotate-45',
} as const

// 꺾쇠 화살표. className은 group-open:-rotate-135처럼 상태 회전을 더할 때만 쓴다
export default function Chevron({ direction = 'down', className }: ChevronProps) {
  const classes = [
    'size-2 shrink-0 border-r-2 border-b-2 border-muted transition-transform',
    DIRECTION_CLASSES[direction],
    className ?? '',
  ]
  return <span className={classes.filter(Boolean).join(' ')} aria-hidden="true" />
}
