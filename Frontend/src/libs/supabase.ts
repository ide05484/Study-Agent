import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY가 .env.local에 설정되어 있지 않습니다.')
}

// TODO: Backend에서 `npm run gen:types` 실행 후 createClient<Database>로 타입 연결
export const supabase = createClient(supabaseUrl, supabaseKey)

// insert 시 RLS(user_id = auth.uid())를 통과하려면 로그인한 사용자 id가 필요하다
export async function requireUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser()
  if (!data.user) throw new Error('로그인이 필요합니다.')
  return data.user.id
}
