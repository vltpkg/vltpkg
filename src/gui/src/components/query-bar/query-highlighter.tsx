import type { ParsedSelectorToken } from '@vltpkg/query'
import { QueryToken } from '@/components/query-bar/query-token.jsx'

export const QueryHighlighter = ({
  query,
  parsedTokens,
}: {
  query: string
  parsedTokens: ParsedSelectorToken[]
}) => {
  if (!query) return null

  // Create a map of token positions
  const tokenMap = new Map<number, ParsedSelectorToken>()
  parsedTokens.forEach(token => {
    let pos = 0
    while ((pos = query.indexOf(token.token, pos)) !== -1) {
      for (let i = pos; i < pos + token.token.length; i++) {
        tokenMap.set(i, token)
      }
      pos += token.token.length
    }
  })

  // Process the query string character by character
  const segments: {
    text: string
    isIdentified: boolean
    token?: ParsedSelectorToken
  }[] = []
  let currentSegment: {
    text: string
    isIdentified: boolean
    token?: ParsedSelectorToken
  } | null = null

  for (let i = 0; i < query.length; i++) {
    const char = query.charAt(i)
    const token = tokenMap.get(i)
    const isIdentified = token !== undefined

    // If we don't have a segment yet, or if the identification status changes
    if (
      !currentSegment ||
      currentSegment.isIdentified !== isIdentified ||
      (isIdentified && currentSegment.token !== token)
    ) {
      if (currentSegment) {
        segments.push(currentSegment)
      }
      currentSegment = {
        text: char,
        isIdentified,
        ...(token && { token }),
      }
    } else {
      // Append to the current segment
      currentSegment.text += char
    }
  }

  // Push the last segment if it exists
  if (currentSegment) {
    segments.push(currentSegment)
  }

  return (
    <div className="pointer-events-none absolute inset-0 left-[2.556rem] top-[0.01rem] flex items-center">
      <div className="flex w-full">
        {segments.map((segment, idx) => (
          <QueryToken variant={segment.token?.type} key={idx}>
            {segment.text}
          </QueryToken>
        ))}
      </div>
    </div>
  )
}
