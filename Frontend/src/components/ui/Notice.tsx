import type { ReactNode } from 'react'

interface NoticeProps {
  tone?: 'info' | 'error'
  children: ReactNode
}

// 안내(info)와 오류(error) 문구. 오류는 스크린 리더에 바로 읽힌다
export default function Notice({ tone = 'info', children }: NoticeProps) {
  if (tone === 'error') {
    return (
      <p className="text-sm text-danger" role="alert">
        {children}
      </p>
    )
  }
  return <p className="text-sm text-muted">{children}</p>
}
