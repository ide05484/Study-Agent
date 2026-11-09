import { useState } from 'react'
import SplashScreen from '../components/layout/SplashScreen.tsx'
import Button from '../components/ui/Button.tsx'
import ButtonLink from '../components/ui/ButtonLink.tsx'
import Chevron from '../components/ui/Chevron.tsx'
import DatePicker from '../components/ui/DatePicker.tsx'
import Disclosure from '../components/ui/Disclosure.tsx'
import Mascot, { type MascotMood } from '../components/ui/Mascot.tsx'
import Notice from '../components/ui/Notice.tsx'
import Section from '../components/ui/Section.tsx'
import Select from '../components/ui/Select.tsx'
import TextArea from '../components/ui/TextArea.tsx'
import TextField from '../components/ui/TextField.tsx'
import NotFoundPage from './NotFoundPage.tsx'

interface ColorToken {
  name: string
  swatchClass: string
}

// 개발 모드 전용 카탈로그. 색상 토큰 이름과 칸 클래스를 전체 이름으로 적는다
const COLOR_TOKENS: ColorToken[] = [
  { name: 'bg', swatchClass: 'bg-bg' },
  { name: 'surface', swatchClass: 'bg-surface' },
  { name: 'fg', swatchClass: 'bg-fg' },
  { name: 'muted', swatchClass: 'bg-muted' },
  { name: 'line', swatchClass: 'bg-line' },
  { name: 'accent', swatchClass: 'bg-accent' },
  { name: 'on-accent', swatchClass: 'bg-on-accent' },
  { name: 'accent-soft', swatchClass: 'bg-accent-soft' },
  { name: 'danger', swatchClass: 'bg-danger' },
  { name: 'kakao', swatchClass: 'bg-kakao' },
  { name: 'on-kakao', swatchClass: 'bg-on-kakao' },
  { name: 'scrim', swatchClass: 'bg-scrim' },
  { name: 'heat-0', swatchClass: 'bg-heat-0' },
  { name: 'heat-1', swatchClass: 'bg-heat-1' },
  { name: 'heat-2', swatchClass: 'bg-heat-2' },
  { name: 'heat-3', swatchClass: 'bg-heat-3' },
  { name: 'heat-4', swatchClass: 'bg-heat-4' },
]

const MASCOT_MOODS: MascotMood[] = ['base', 'cheer', 'think', 'oops']

interface CatalogColumnProps {
  themeClass: 'theme-light' | 'theme-dark'
  idPrefix: string
}

function CatalogColumn({ themeClass, idPrefix }: CatalogColumnProps) {
  const [date, setDate] = useState('')

  return (
    <div className={`${themeClass} min-w-0 flex-1 bg-bg px-4 py-6 text-fg`}>
      <div className="mx-auto max-w-[480px]">
        <Section title="색상 토큰">
          <ul className="grid grid-cols-3 gap-3">
            {COLOR_TOKENS.map((token) => (
              <li key={token.name} className="text-xs">
                <div className={`h-10 rounded-lg border border-line ${token.swatchClass}`} />
                <p className="mt-1">{token.name}</p>
              </li>
            ))}
            <li className="text-xs">
              <p className="marker h-10 text-[15px] font-bold">형광펜</p>
              <p className="mt-1">marker</p>
            </li>
          </ul>
        </Section>

        <Section title="Button">
          <div className="flex flex-wrap gap-3">
            <Button type="button">주요</Button>
            <Button type="button" variant="ghost">
              보조
            </Button>
            <Button type="button" disabled>
              비활성
            </Button>
            <Button type="button" variant="ghost" disabled>
              보조 비활성
            </Button>
          </div>
          <div className="mt-3">
            <Button type="button" block>
              가로 가득
            </Button>
          </div>
        </Section>

        <Section title="ButtonLink">
          <div className="flex flex-wrap gap-3">
            <ButtonLink to="/ui">주요</ButtonLink>
            <ButtonLink to="/ui" variant="ghost">
              보조
            </ButtonLink>
          </div>
        </Section>

        <Section title="TextField">
          <div className="flex flex-col gap-3">
            <TextField aria-label="일반" placeholder="일반" />
            <TextField aria-label="비활성" placeholder="비활성" disabled />
          </div>
        </Section>

        <Section title="Select">
          <div className="flex flex-col gap-3">
            <Select aria-label="일반" defaultValue="korean">
              <option value="korean">국어</option>
              <option value="english">영어</option>
            </Select>
            <Select aria-label="비활성" defaultValue="korean" disabled>
              <option value="korean">국어</option>
            </Select>
          </div>
        </Section>

        <Section title="TextArea">
          <div className="flex flex-col gap-3">
            <TextArea aria-label="일반" placeholder="일반" rows={2} />
            <TextArea aria-label="비활성" placeholder="비활성" rows={2} disabled />
          </div>
        </Section>

        <Section title="Section">
          <div className="rounded-xl border border-line px-4">
            <Section title="예시 제목">
              <p>제목이 있는 영역</p>
            </Section>
            <Section>
              <p>제목이 없는 영역</p>
            </Section>
          </div>
        </Section>

        <Section title="DatePicker">
          <DatePicker id={`${idPrefix}-date`} label="예시 날짜" value={date} onChange={setDate} />
        </Section>

        <Section title="Disclosure">
          <Disclosure summary="펼침 행">
            <p className="ml-1 border-l border-line pl-3 text-sm text-muted">펼친 내용</p>
          </Disclosure>
        </Section>

        <Section title="Notice">
          <div className="flex flex-col gap-2">
            <Notice>안내 문구</Notice>
            <Notice tone="error">오류 문구</Notice>
          </div>
        </Section>

        <Section title="Chevron">
          <div className="flex items-center gap-6">
            <Chevron direction="down" />
            <Chevron direction="up" />
            <Chevron direction="right" />
          </div>
        </Section>

        <Section title="Mascot">
          <ul className="grid grid-cols-2 gap-3">
            {MASCOT_MOODS.map((mood) => (
              <li key={`${idPrefix}-${mood}`} className="text-xs">
                <Mascot mood={mood} size={96} />
                <p>{mood}</p>
              </li>
            ))}
          </ul>
        </Section>

        {/* SplashScreen 루트가 h-dvh라 창이 높으면 틀 안에서 내용이 아래로 밀린다 */}
        <Section title="SplashScreen">
          <div className="h-[600px] overflow-hidden rounded-xl border border-line">
            <SplashScreen />
          </div>
        </Section>

        <Section title="NotFoundPage">
          <div className="h-[600px] overflow-hidden rounded-xl border border-line">
            <NotFoundPage />
          </div>
        </Section>
      </div>
    </div>
  )
}

// 개발 모드에서만 열리는 컴포넌트 카탈로그. 라이트(왼쪽)와 다크(오른쪽)를 나란히 보여 준다
export default function UiCatalogPage() {
  return (
    <div className="flex min-h-dvh">
      <CatalogColumn themeClass="theme-light" idPrefix="light" />
      <CatalogColumn themeClass="theme-dark" idPrefix="dark" />
    </div>
  )
}
