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

  let q = query
  let curr = 0
  const result = []
  while (q) {
    const astItem = parsedTokens[curr]
    const token = astItem?.token
    const type = astItem?.type

    if (!token) {
      const segment = {
        type: 'text' as ParsedSelectorToken['type'],
        token: q,
      }
      result.push(segment)
      break
    }

    if (q.startsWith(token)) {
      const segment = {
        type,
        token,
      }

      result.push(segment)

      q = q.slice(token.length)
      curr++
    } else {
      const [unrecognizedToken] = q.split(token)
      if (!unrecognizedToken) break
      const segment = {
        type: 'string' as ParsedSelectorToken['type'],
        token: unrecognizedToken,
      }
      result.push(segment)
      q = q.slice(unrecognizedToken.length)
      continue
    }
  }

  return (
    <div className="pointer-events-none absolute inset-0 left-[2.556rem] top-[0.01rem] flex items-center">
      <div className="flex w-full">
        {result.map((segment, idx) => (
          <QueryToken variant={segment.type} key={idx}>
            {segment.token}
          </QueryToken>
        ))}
      </div>
    </div>
  )
}
