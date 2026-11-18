import baseSrc from '../../assets/mascot/hapgyeok-base.svg'
import cheerSrc from '../../assets/mascot/hapgyeok-cheer.svg'
import oopsSrc from '../../assets/mascot/hapgyeok-oops.svg'
import thinkSrc from '../../assets/mascot/hapgyeok-think.svg'

export type MascotMood = 'base' | 'cheer' | 'think' | 'oops'

const MASCOT_SRC: Record<MascotMood, string> = {
  base: baseSrc,
  cheer: cheerSrc,
  think: thinkSrc,
  oops: oopsSrc,
}

interface MascotProps {
  mood: MascotMood
  size: number
}

// 코치 캐릭터 합격이. 내용이 적은 화면(로그인, 앱 시작, 404)에만 쓴다
export default function Mascot({ mood, size }: MascotProps) {
  return <img src={MASCOT_SRC[mood]} alt="코치 합격이" width={size} height={size} />
}
