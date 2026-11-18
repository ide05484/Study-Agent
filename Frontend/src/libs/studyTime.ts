// 순공시간 잔디 단계의 아래 경계(분). 120분 미만 1, 120~239분 2, 240~359분 3, 360분 이상 4
export const STUDY_TIME_LEVEL_MINUTES = [120, 240, 360] as const

export function studyTimeLevel(minutes: number): 1 | 2 | 3 | 4 {
  if (minutes >= STUDY_TIME_LEVEL_MINUTES[2]) return 4
  if (minutes >= STUDY_TIME_LEVEL_MINUTES[1]) return 3
  if (minutes >= STUDY_TIME_LEVEL_MINUTES[0]) return 2
  return 1
}

// Backend _shared/units.ts의 formatMinutes와 같은 표기. 예) 200 → 3시간 20분, 180 → 3시간, 40 → 40분
export function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest}분`
  return rest === 0 ? `${hours}시간` : `${hours}시간 ${rest}분`
}
