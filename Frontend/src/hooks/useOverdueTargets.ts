import { useCallback, useEffect, useRef, useState } from 'react'
import { regeneratePlan } from '../api/plan.ts'
import { fetchBooks, updateBook } from '../api/study.ts'
import type { Book } from '../interfaces/study.ts'
import { isTargetOverdue, roundTargetBounds } from '../libs/books.ts'
import { addDays, todayKey } from '../libs/date.ts'
import { toErrorMessage } from '../libs/errors.ts'
import { useAlert } from './useDialog.ts'

export interface OverdueItem {
  book: Book
  round: number // 지난 목표일의 회독(= 그 교재의 지금 회독)
  defaultDate: string // 나중에를 누르면 쓰는 다음 목표일
  maxDate: string | undefined // 고를 수 있는 마지막 날: 시험 전날과 다음 회독 목표일 중 이른 날
}

export interface OverdueTargetsState {
  items: OverdueItem[]
  error: string | null
  // dates: 교재 id → 새 목표일. 하나라도 저장하면 계획을 한 번 다시 나눈다. 모두 저장했으면 true,
  // 실패한 교재는 items에 남고 error로 알린다
  save: (dates: Record<string, string>) => Promise<boolean>
  // 모든 항목을 기본 목표일로 저장한다. 저장에 실패해도 이번 세션에서는 모달을 닫는다(공부 설정에 목표일 지남으로 남는다)
  postpone: () => Promise<boolean>
}

// DialogProvider 안에서만 쓴다(계획 재분배 실패를 알림 창으로 알린다).
// 앱이 열린 뒤 시험일을 처음 알게 됐을 때 한 번만 조회하고, 저장하거나 나중에를 누르면 비워 다시 묻지 않는다
export function useOverdueTargets(examDate: string | null): OverdueTargetsState {
  const [items, setItems] = useState<OverdueItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const checkedRef = useRef(false)
  const alert = useAlert()

  useEffect(() => {
    if (!examDate || checkedRef.current) return
    const today = todayKey()
    const lastDay = addDays(examDate, -1)
    // 시험 전날이 이미 지났으면 고를 날짜가 없으니 묻지 않는다
    if (lastDay < today) return
    let ignore = false
    fetchBooks()
      .then((books) => {
        if (ignore) return
        checkedRef.current = true
        setItems(
          books
            .filter((book) => isTargetOverdue(book, today))
            .map((book) => {
              const round = book.current_round
              const next = book.round_targets[round] // 다음 회독 목표일
              const examMax = roundTargetBounds(book.round_targets, round - 1, round, today, examDate).max ?? lastDay
              // 다음 회독 목표일이 이미 지났으면 상한에서 뺀다(고를 날짜가 없어 나중에가 과거 날짜를 저장하게 된다)
              const maxDate = next && next >= today && next < examMax ? next : examMax
              const wanted = addDays(today, 14)
              return { book, round, defaultDate: wanted < maxDate ? wanted : maxDate, maxDate }
            }),
        )
      })
      .catch(() => {
        // 확인에 실패하면 모달을 띄우지 않는다. 목표일 지남은 공부 설정 화면의 교재 행에서도 보인다
      })
    return () => {
      ignore = true
    }
  }, [examDate])

  const save = useCallback(
    async (dates: Record<string, string>) => {
      setError(null)
      const results = await Promise.allSettled(
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
      const failed = items.filter((_, i) => results[i].status === 'rejected')
      if (failed.length > 0) {
        const first = results.find((r): r is PromiseRejectedResult => r.status === 'rejected')
        setError(toErrorMessage(first?.reason))
      }
      setItems(failed)
      if (failed.length === items.length) return false
      try {
        await regeneratePlan()
      } catch {
        void alert({
          title: '계획을 다시 나누지 못했어요',
          message: '목표일은 저장했지만 계획을 다시 나누지 못했어요. 공부 설정에서 다시 저장해 주세요.',
        })
      }
      return failed.length === 0
    },
    [items, alert],
  )

  const postpone = useCallback(async () => {
    await save(Object.fromEntries(items.map(({ book, defaultDate }) => [book.id, defaultDate])))
    setItems([])
    setError(null)
    return true
  }, [items, save])

  return { items, error, save, postpone }
}
