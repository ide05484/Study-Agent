const PLAN_CHANGED = 'plan-changed'

// 계획이 다시 나뉘었음을 알린다(채팅의 오늘 분량이 다시 불러오도록)
export function emitPlanChanged(): void {
  window.dispatchEvent(new CustomEvent(PLAN_CHANGED))
}

// 계획이 다시 나뉠 때마다 listener를 부른다. 돌려주는 함수로 해제한다
export function onPlanChanged(listener: () => void): () => void {
  window.addEventListener(PLAN_CHANGED, listener)
  return () => window.removeEventListener(PLAN_CHANGED, listener)
}
