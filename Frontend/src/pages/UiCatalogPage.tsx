import { useState } from 'react'
import SplashScreen from '../components/layout/SplashScreen.tsx'
import Button from '../components/ui/Button.tsx'
import ButtonLink from '../components/ui/ButtonLink.tsx'
import Chevron from '../components/ui/Chevron.tsx'
import ChipGroup from '../components/ui/ChipGroup.tsx'
import DatePicker from '../components/ui/DatePicker.tsx'
import DialogProvider from '../components/ui/DialogProvider.tsx'
import Disclosure from '../components/ui/Disclosure.tsx'
import FormField from '../components/ui/FormField.tsx'
import IconButton from '../components/ui/IconButton.tsx'
import Mascot, { type MascotMood } from '../components/ui/Mascot.tsx'
import Menu from '../components/ui/Menu.tsx'
import Modal from '../components/ui/Modal.tsx'
import Notice from '../components/ui/Notice.tsx'
import Section from '../components/ui/Section.tsx'
import Tabs, { type TabItem } from '../components/ui/Tabs.tsx'
import TextArea from '../components/ui/TextArea.tsx'
import TextField from '../components/ui/TextField.tsx'
import { useAlert, useConfirm, useProgress } from '../hooks/useDialog.ts'
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

const UNIT_OPTIONS = [
  { value: 'day', label: 'Day' },
  { value: 'chapter', label: '챕터' },
  { value: 'session', label: '회차' },
]

// DialogProvider 안에서만 쓸 수 있는 확인·알림 예시
function DialogExamples() {
  const confirm = useConfirm()
  const alert = useAlert()
  const progress = useProgress()
  const [result, setResult] = useState('')

  async function handleConfirm() {
    const ok = await confirm({
      title: '교재 삭제',
      message: "'기본서'을(를) 삭제할까요?",
      confirmLabel: '삭제',
      tone: 'danger',
    })
    setResult(ok ? '삭제를 골랐어요' : '취소했어요')
  }

  async function handleAlert() {
    await alert({ title: '알려 드려요', message: '저장했어요.' })
    setResult('알림을 닫았어요')
  }

  // 2초 동안 진행 창을 띄운 뒤 결과 창으로 바꾼다
  async function handleProgress() {
    const message = await progress(
      { title: '계획을 나누는 중이에요', message: '잠시만 기다려 주세요.' },
      () =>
        new Promise<string>((resolve) => setTimeout(() => resolve('시험 전날까지 219일 계획을 다시 나눴어요.'), 2000)),
    )
    await alert({ title: '계획을 세웠어요', message })
    setResult('진행 → 결과 창을 닫았어요')
  }

  return (
    <>
      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="ghost" onClick={() => void handleConfirm()}>
          확인 창
        </Button>
        <Button type="button" variant="ghost" onClick={() => void handleAlert()}>
          알림 창
        </Button>
        <Button type="button" variant="ghost" onClick={() => void handleProgress()}>
          진행 → 결과 창
        </Button>
      </div>
      <p className="mt-2 text-sm text-muted" aria-live="polite">
        {result}
      </p>
    </>
  )
}

const TAB_ITEMS: TabItem<'a' | 'b' | 'c'>[] = [
  { value: 'a', label: '남은 공부 분량' },
  { value: 'b', label: '시험 점수' },
  { value: 'c', label: '과목별 공부법' },
]
const SUB_TAB_ITEMS: TabItem<'all' | 'ko' | 'en'>[] = [
  { value: 'all', label: '시험별' },
  { value: 'ko', label: '국어' },
  { value: 'en', label: '영어' },
]

interface TabsExampleProps {
  idPrefix: string
}

// md: 화면을 나누는 탭(공부 설정), sm: 영역 안의 보기 탭(시험 점수)
function TabsExample({ idPrefix }: TabsExampleProps) {
  const [tab, setTab] = useState<'a' | 'b' | 'c'>('a')
  const [subTab, setSubTab] = useState<'all' | 'ko' | 'en'>('all')
  return (
    <div className="flex flex-col gap-6">
      <Tabs label="예시 화면 탭" items={TAB_ITEMS} value={tab} onChange={setTab} idPrefix={`${idPrefix}-tabs`} />
      <Tabs
        label="예시 보기 탭"
        items={SUB_TAB_ITEMS}
        value={subTab}
        onChange={setSubTab}
        idPrefix={`${idPrefix}-subtabs`}
        size="sm"
      />
    </div>
  )
}

interface FormFieldExampleProps {
  idPrefix: string
}

// 비워 두고 확인을 누르면 라벨 옆 오류 문구와 흔들림을 본다
function FormFieldExample({ idPrefix }: FormFieldExampleProps) {
  const [value, setValue] = useState('')
  const [shake, setShake] = useState(0)
  const error = value.trim() === '' ? '필수 항목이에요.' : null
  const shown = shake > 0 ? error : null

  return (
    <div className="grid gap-3">
      <FormField label="교재명" htmlFor={`${idPrefix}-form-field`} required error={shown} shake={shake}>
        <TextField
          id={`${idPrefix}-form-field`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="예: 봉투모의고사"
          invalid={!!shown}
        />
      </FormField>
      <div>
        <Button type="button" variant="ghost" onClick={() => setShake((n) => n + 1)}>
          확인
        </Button>
      </div>
    </div>
  )
}

interface CatalogColumnProps {
  themeClass: 'theme-light' | 'theme-dark'
  idPrefix: string
}

function CatalogColumn({ themeClass, idPrefix }: CatalogColumnProps) {
  const [date, setDate] = useState('')
  const [unit, setUnit] = useState('session')
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div className={`${themeClass} min-w-0 flex-1 bg-bg px-4 py-6 text-fg`}>
      {/* /ui는 AppLayout 밖이라 확인·알림 예시가 동작하도록 따로 감싼다 */}
      <DialogProvider>
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
              <TextField aria-label="단위" placeholder="예: 60" suffix="회차" />
              <TextField aria-label="오류" placeholder="오류" invalid />
            </div>
          </Section>

          <Section title="FormField">
            <FormFieldExample idPrefix={idPrefix} />
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
              <Section
                title="오른쪽 끝 버튼(action)"
                action={
                  <div className="flex">
                    <IconButton icon="plus" label="예시 추가" />
                    <Menu label="예시 영역 메뉴" items={[{ label: '삭제', tone: 'danger', onSelect: () => {} }]} />
                  </div>
                }
              >
                <p>제목 줄 오른쪽에 + 와 Menu</p>
              </Section>
            </div>
          </Section>

          <Section title="IconButton">
            <div className="flex gap-2">
              <IconButton icon="plus" label="예시 추가" />
              <IconButton icon="kebab" label="예시 더보기" />
              <IconButton icon="plus" label="예시 비활성" disabled />
            </div>
          </Section>

          <Section title="Menu">
            <div className="flex items-center justify-between">
              <span>교재 행 예시</span>
              <Menu
                label="예시 메뉴"
                items={[
                  { label: '수정', onSelect: () => {} },
                  { label: '삭제', tone: 'danger', onSelect: () => {} },
                ]}
              />
            </div>
          </Section>

          <Section title="DatePicker">
            <DatePicker id={`${idPrefix}-date`} label="예시 날짜" value={date} onChange={setDate} />
          </Section>

          <Section title="ChipGroup">
            <div className="flex flex-col gap-3">
              <ChipGroup label="예시 단위" options={UNIT_OPTIONS} value={unit} onChange={setUnit} />
              <ChipGroup label="예시 단위 비활성" options={UNIT_OPTIONS} value="day" onChange={() => {}} disabled />
            </div>
          </Section>

          <Section title="Tabs">
            <TabsExample idPrefix={idPrefix} />
          </Section>

          <Section title="Modal">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(true)}>
              모달 열기
            </Button>
            <Modal
              open={modalOpen}
              title="예시 모달"
              onClose={() => setModalOpen(false)}
              actions={
                <Button type="button" onClick={() => setModalOpen(false)}>
                  닫기
                </Button>
              }
            >
              <p className="text-muted">Esc를 누르거나 닫기를 누르면 닫혀요. 바깥을 눌러서는 닫히지 않아요.</p>
            </Modal>
          </Section>

          <Section title="확인·알림 (useConfirm, useAlert)">
            <DialogExamples />
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
      </DialogProvider>
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
