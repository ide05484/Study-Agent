import ButtonLink from '../components/ui/ButtonLink.tsx'
import Mascot from '../components/ui/Mascot.tsx'

// 로그인한 사용자가 알 수 없는 주소로 들어왔을 때
export default function NotFoundPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
      <Mascot mood="oops" size={150} />
      <h2 className="mt-2 text-xl font-bold">길을 잃었어요</h2>
      <p className="text-sm text-muted">주소가 바뀌었거나 없는 화면이에요. 오늘 채팅방으로 돌아가서 이어서 공부해요.</p>
      <div className="mt-3">
        <ButtonLink to="/">오늘 채팅으로 가기</ButtonLink>
      </div>
    </div>
  )
}
