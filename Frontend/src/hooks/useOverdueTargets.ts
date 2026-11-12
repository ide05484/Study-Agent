import { useCallback, useEffect, useState } from 'react'
import { regeneratePlan } from '../api/plan.ts'
import { fetchBooks, updateBook } from '../api/study.ts'
import type { Book } from '../interfaces/study.ts'
import { isTargetOverdue } from '../libs/books.ts'
import { addDays, todayKey } from '../libs/date.ts'
import { toErrorMessage } from '../libs/errors.ts'
import { useAlert } from './useDialog.ts'

export interface OverdueItem {
  book: Book
  round: number // 지난 목표일의 회독(= 그 교재의 지금 회독)
  defaultDate: string // 나중에를 누르면 쓰는 다음 목표일
}

export interface OverdueTargetsState {
  items: OverdueItem[]
  error: string | null
  // dates: 교재 id → 새 목표일. 모두 저장하면 계획을 한 번 다시 나눈다. 목표일 저장에 실패하면 false
  save: (dates: Record<string, string>) => Promise<boolean>
  // 모든 항목을 기본 목표일로 저장한다
  postpone: () => Promise<boolean>
}

// DialogProvider 안에서만 쓴다(계획 재분배 실패를 알림 창으로 알린다).
// 시험일을 알게 되면 한 번 조회하고, 저장하거나 나중에를 누르면 비워 같은 화면에서 다시 묻지 않는다
export function useOverdueTargets(examDate: string | null): OverdueTargetsState {
  const [items, setItems] = useState<OverdueItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const alert = useAlert()

  useEffect(() => {
    if (!examDate) return
    const today = todayKey()
    const lastDay = addDays(examDate, -1)
    // 시험 전날이 이미 지났으면 고를 날짜가 없으니 묻지 않는다
    if (lastDay < today) return
    const defaultDate = [addDays(today, 14), lastDay].sort()[0]
    let ignore = false
    fetchBooks()
      .then((books) => {
        if (ignore) return
        setItems(
          books
            .filter((book) => isTargetOverdue(book, today))
            .map((book) => ({ book, round: book.current_round, defaultDate })),
        )
      })
      .catch(() => {
        // 확인에 실패하면 모달을 띄우지 않는다. 목표일 지남은 공부 설정 화면의 교재 행에서도 보인다
      })
    return () => {
      ignore = true
    }
  }, [examDate])

  const saveDates = useCallback(
    async (dates: Record<string, string>) => {
      setError(null)
      try {
        await Promise.all(
          items.map(({ book, round }) => {
            const round_targets = [...book.round_targets]
            while (round_targets.length < round) round_targets.push(null)
            round_targets[round - 1] = dates[book.id]
            return updateBook(book.id, {
              current_round: book.current_round,
              current_unit: book.current_unit,
              target_rounds: book.target_rounds,
              daily_amount: book.daily_amount,
              round_targets,
            })
          }),
        )
      } catch (e) {
        setError(toErrorMessage(e))
        return false
      }
      setItems([])
      try {
        await regeneratePlan()
      } catch {
        void alert({
          title: '계획을 다시 나누지 못했어요',
          message: '목표일은 저장했지만 계획을 다시 나누지 못했어요. 공부 설정에서 다시 저장해 주세요.',
        })
      }
      return true
    },
    [items, alert],
  )

  const postpone = useCallback(
    () => saveDates(Object.fromEntries(items.map(({ book, defaultDate }) => [book.id, defaultDate]))),
    [items, saveDates],
  )

  return { items, error, save: saveDates, postpone }
}
