// 필드명은 DB 컬럼(snake_case)을 그대로 따른다
export type NotifyChannel = 'pwa' | 'kakao'

export interface Profile {
  id: string
  display_name: string | null
  exam_date: string | null
  target_total_score: number | null
  notify_time: string
  notify_channel: NotifyChannel
  timezone: string
}
