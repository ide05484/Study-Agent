// Supabase 오류(PostgrestError 등)는 Error 인스턴스가 아닐 수 있어 message 필드로 판별한다
export function toErrorMessage(e: unknown): string {
  if (typeof e === 'object' && e !== null && 'message' in e && typeof e.message === 'string') {
    return e.message
  }
  return '알 수 없는 오류가 발생했습니다.'
}
