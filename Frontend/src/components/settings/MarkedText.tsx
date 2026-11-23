import { parseMarks } from '../../libs/marks.ts'

interface MarkedTextProps {
  text: string
}

// **굵게**, ==형광펜==이 든 공부법 글. HTML로 해석하지 않고 조각마다 글로 그린다
export default function MarkedText({ text }: MarkedTextProps) {
  return (
    <>
      {/* 조각 순서는 글이 바뀔 때만 바뀌므로 index를 키로 쓴다 */}
      {parseMarks(text).map((segment, index) => {
        if (segment.mark === 'bold') {
          return (
            <strong key={index} className="font-semibold">
              {segment.text}
            </strong>
          )
        }
        if (segment.mark === 'highlight') {
          return (
            <mark key={index} className="marker bg-transparent text-inherit">
              {segment.text}
            </mark>
          )
        }
        return <span key={index}>{segment.text}</span>
      })}
    </>
  )
}
