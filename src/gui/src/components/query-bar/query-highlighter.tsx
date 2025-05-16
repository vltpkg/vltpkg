import { forwardRef } from 'react'
import { cn } from '@/lib/utils.ts'
import { QueryToken } from '@/components/query-bar/query-token.tsx'
import type { ParsedSelectorToken } from '@vltpkg/query'

interface QueryHighlighterProps {
  query: string
  parsedTokens: ParsedSelectorToken[]
  className?: string
}

export const QueryHighlighter = forwardRef<
  HTMLDivElement,
  QueryHighlighterProps
>(({ query, parsedTokens, className }, ref) => {
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
    <div
      ref={ref}
      className={cn(
        'scrollbar-hidden pointer-events-none absolute inset-0 left-[2.556rem] top-[0.01rem] flex items-center overflow-x-auto pr-32',
        className,
      )}>
      <div className="flex whitespace-nowrap">
        {result.map((segment, idx) => (
          <QueryToken variant={segment.type} key={idx}>
            {segment.token}
          </QueryToken>
        ))}
      </div>
    </div>
  )
})
