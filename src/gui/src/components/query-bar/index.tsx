import { useEffect, useRef, useState } from 'react'
import { useGraphStore } from '@/state/index.ts'
import { Input } from '@/components/ui/input.tsx'
import { Query } from '@vltpkg/query'
import { QueryHighlighter } from '@/components/query-bar/query-highlighter.tsx'
import { cn } from '@/lib/utils.ts'
import type { ParsedSelectorToken } from '@vltpkg/query'
import type { ChangeEvent } from 'react'

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
  const queryHighlighterRef = useRef<HTMLDivElement>(null)
  const [parsedTokens, setParsedTokens] = useState<
    ParsedSelectorToken[]
  >([])

  useEffect(() => {
    if (!q || !query) {
      setParsedTokens([])
      return
    }
    try {
      const tokens = Query.getQueryTokens(query)
      setParsedTokens(tokens)
    } catch (error) {
      console.error(`Error parsing query: ${error}`)
    }
  }, [query, q])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault()
        inputRef.current?.focus()
      } else if (event.key === 'Escape') {
        event.preventDefault()
        inputRef.current?.blur()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  /**
   * Sync the highlighter scroll position with the input field's caret position
   */
  useEffect(() => {
    const input = inputRef.current
    const highlighter = queryHighlighterRef.current

    if (!input || !highlighter) return

    const syncScroll = () => {
      const inputRect = input.getBoundingClientRect()
      const caretPosition = input.selectionStart || 0

      // Create a temporary span to measure text width
      const span = document.createElement('span')
      span.style.visibility = 'hidden'
      span.style.position = 'absolute'
      span.style.whiteSpace = 'pre'
      span.style.font = window.getComputedStyle(input).font
      span.textContent = input.value.substring(0, caretPosition)
      document.body.appendChild(span)

      const caretOffset = span.offsetWidth
      document.body.removeChild(span)

      // Calculate the scroll position needed to show the caret
      const scrollLeft = caretOffset - inputRect.width / 2

      // Apply the scroll with a small delay to ensure the DOM has updated
      requestAnimationFrame(() => {
        highlighter.scrollLeft = Math.max(0, scrollLeft)
      })
    }

    // Sync on input changes and selection changes
    const events = ['input', 'select', 'click', 'keyup']
    events.forEach(event => input.addEventListener(event, syncScroll))

    // Initial sync
    syncScroll()

    return () => {
      events.forEach(event =>
        input.removeEventListener(event, syncScroll),
      )
    }
  }, [])

  return (
    <div className="relative flex grow items-center">
      {startContent && (
        <div className="absolute z-[2] pr-8">{startContent}</div>
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
          className={cn(
            'text-sm text-transparent caret-black dark:caret-white',
            startContent && 'pl-10',
            endContent && 'pr-32',
            className,
          )}
          placeholder="Query Lookup, e.g: :root > *"
          value={query}
          onChange={(e: ChangeEvent) => {
            const value = (e.currentTarget as HTMLInputElement).value
            updateQuery(value)
          }}
        />
        <QueryHighlighter
          ref={queryHighlighterRef}
          query={query}
          parsedTokens={parsedTokens}
        />
      </div>
      {endContent && (
        <div className="absolute right-0 z-[2]">{endContent}</div>
      )}
    </div>
  )
}
