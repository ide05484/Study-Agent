// 폼 칸 공용 검사와 오류 문구. 교재·점수 폼이 같이 쓴다

export const REQUIRED_MESSAGE = '필수 항목이에요.'

// 입력 칸 문자열이 min~max의 정수인지(빈 칸·소수는 false). max를 생략하면 상한이 없다
export function isIntegerInRange(text: string, min: number, max = Infinity): boolean {
  const value = Number(text)
  return text.trim() !== '' && Number.isInteger(value) && value >= min && value <= max
}

// 정수 칸의 오류 문구. 비었으면 required일 때만 필수 안내, 범위 밖이면 범위 안내, 맞으면 null
export function integerFieldError(text: string, min: number, max: number, required: boolean): string | null {
  if (text.trim() === '') return required ? REQUIRED_MESSAGE : null
  if (isIntegerInRange(text, min, max)) return null
  if (max === Infinity) return `${min} 이상의 정수로 적어 주세요.`
  if (min === max) return `${min}만 적을 수 있어요.`
  return `${min}~${max} 사이의 정수로 적어 주세요.`
}
