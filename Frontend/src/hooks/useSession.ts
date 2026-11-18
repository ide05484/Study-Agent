import type { Session } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { getSession, onSessionChange } from '../api/auth.ts'

export function useSession(): { session: Session | null; loading: boolean } {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let ignore = false
    getSession()
      .then((result) => {
        if (!ignore) setSession(result)
      })
      .catch(() => {
        if (!ignore) setSession(null)
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })
    const unsubscribe = onSessionChange((next) => {
      setSession(next)
      setLoading(false)
    })
    return () => {
      ignore = true
      unsubscribe()
    }
  }, [])

  return { session, loading }
}
