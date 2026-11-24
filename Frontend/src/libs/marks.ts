export interface MarkSegment {
  text: string
  mark: 'plain' | 'bold' | 'highlight'
}

const MARK_PATTERN = /\*\*([^*]+?)\*\*|==([^=]+?)==/g

// 공부법 글의 **굵게**와 ==형광펜==을 조각으로 나눈다. 짝이 없는 ** · ==는 글 그대로 둔다
export function parseMarks(text: string): MarkSegment[] {
  const segments: MarkSegment[] = []
  let last = 0
  for (const match of text.matchAll(MARK_PATTERN)) {
    if (match.index > last) segments.push({ text: text.slice(last, match.index), mark: 'plain' })
    if (match[1] !== undefined) segments.push({ text: match[1], mark: 'bold' })
    else segments.push({ text: match[2], mark: 'highlight' })
    last = match.index + match[0].length
  }
  if (last < text.length) segments.push({ text: text.slice(last), mark: 'plain' })
  return segments
}
