import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { Input } from '@/components/ui/input.jsx'
import { useGraphStore } from '@/state/index.js'
import type { ParsedSelectorToken } from '@vltpkg/query'
import { QueryHighlighter } from '@/components/query-bar/query-highlighter.jsx'

interface QueryBar {
  className?: string
  tabIndex?: number
  startContent?: React.ReactNode
  endContent?: React.ReactNode
}

export const QueryBar = ({
  className,
  tabIndex,
  startContent,
  endContent,
}: QueryBar) => {
  const updateQuery = useGraphStore(state => state.updateQuery)
  const query = useGraphStore(state => state.query)
  const q = useGraphStore(state => state.q)
  const inputRef = useRef<HTMLInputElement>(null)
  const [parsedTokens, setParsedTokens] = useState<
    ParsedSelectorToken[]
  >([])
  const lastValidTokensRef = useRef<ParsedSelectorToken[]>([])

  useEffect(() => {
    if (!q || !query) {
      setParsedTokens([])
      lastValidTokensRef.current = []
      return
    }
    try {
      const tokens = q.parse(query)
      console.log(tokens)
      setParsedTokens(tokens)
      lastValidTokensRef.current = tokens
    } catch (error) {
      console.error(`Error parsing query: ${error}`)
      // Only use cached tokens if their total length doesn't exceed current query length
      const totalCachedLength = lastValidTokensRef.current.reduce(
        (sum, token) => sum + token.token.length,
        0,
      )
      if (totalCachedLength <= query.length) {
        setParsedTokens(lastValidTokensRef.current)
      } else {
        setParsedTokens([])
      }
    }
  }, [query, q])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (true) {
        case (event.metaKey || event.ctrlKey) && event.key === 'k':
          event.preventDefault()
          inputRef.current?.focus()
          break

        case event.key === 'Escape':
          event.preventDefault()
          inputRef.current?.blur()
          break

        default:
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  return (
    <div className="relative flex grow items-center">
      {startContent && (
        <div className="absolute pr-8">{startContent}</div>
      )}
      <div className="relative w-full">
        <Input
          type="text"
          role="search"
          tabIndex={tabIndex}
          autoCorrect="off"
          autoComplete="off"
          autoCapitalize="off"
          ref={inputRef}
          className={`${className} ${startContent ? 'pl-10' : ''} bg-transparent text-sm text-transparent caret-black dark:caret-white`}
          placeholder="Query Lookup, e.g: :root > *"
          value={query}
          onChange={(e: ChangeEvent) => {
            const value = (e.currentTarget as HTMLInputElement).value
            updateQuery(value)
          }}
        />
        <QueryHighlighter query={query} parsedTokens={parsedTokens} />
      </div>
      {endContent && (
        <div className="absolute right-0">{endContent}</div>
      )}
    </div>
  )
}
