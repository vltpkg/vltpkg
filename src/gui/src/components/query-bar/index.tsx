import { forwardRef, useEffect, useRef, useMemo } from 'react'
import { useGraphStore } from '@/state/index.ts'
import { Input } from '@/components/ui/input.tsx'
import { Query } from '@vltpkg/query'
import { QueryHighlighter } from '@/components/query-bar/query-highlighter.tsx'
import { cn } from '@/lib/utils.ts'

import type { HTMLAttributes, ReactNode, ChangeEvent } from 'react'
import type { ParsedSelectorToken } from '@vltpkg/query'

interface QueryBar extends HTMLAttributes<HTMLDivElement> {
  className?: string
  tabIndex?: number
  startContent?: ReactNode
  endContent?: ReactNode
  wrapperClassName?: string
}

export const QUERY_BAR_ID = 'query-bar'

export const QueryBar = forwardRef<HTMLDivElement, QueryBar>(
  (
    {
      className,
      wrapperClassName,
      tabIndex,
      startContent,
      endContent,
      onFocus,
      onBlur,
      ...rest
    },
    ref,
  ) => {
    const updateQuery = useGraphStore(state => state.updateQuery)
    const query = useGraphStore(state => state.query)
    const q = useGraphStore(state => state.q)
    const inputRef = useRef<HTMLInputElement>(null)
    const queryHighlighterRef = useRef<HTMLDivElement>(null)

    const parsedTokens = useMemo<ParsedSelectorToken[]>(() => {
      if (!q || !query) {
        return []
      }
      try {
        return Query.getQueryTokens(query)
      } catch (error) {
        console.error(`Error parsing query: ${error}`)
        return []
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
      events.forEach(event =>
        input.addEventListener(event, syncScroll),
      )

      // Initial sync
      syncScroll()

      return () => {
        events.forEach(event =>
          input.removeEventListener(event, syncScroll),
        )
      }
    }, [])

    return (
      <div
        ref={ref}
        className={cn(
          'relative flex grow items-center',
          wrapperClassName,
        )}
        {...rest}>
        {startContent && (
          <div className="absolute z-[4] pr-8">{startContent}</div>
        )}
        <div id={QUERY_BAR_ID} className="relative z-[3] w-full">
          <Input
            onFocus={onFocus}
            onBlur={onBlur}
            type="text"
            role="search"
            tabIndex={tabIndex}
            autoCorrect="off"
            autoComplete="off"
            autoCapitalize="off"
            ref={inputRef}
            className={cn(
              'dark:bg-muted-foreground/5 rounded-xl bg-white text-sm text-transparent caret-black focus-visible:ring-0 focus-visible:ring-transparent focus-visible:ring-offset-0 dark:caret-white',
              startContent && 'pl-10',
              endContent && 'pr-32',
              className,
            )}
            placeholder="Query Lookup, e.g: :root > *"
            value={query}
            onChange={(e: ChangeEvent) => {
              const value = (e.currentTarget as HTMLInputElement)
                .value
              updateQuery(value)
            }}
          />
          <QueryHighlighter
            parsedTokens={parsedTokens}
            ref={queryHighlighterRef}
            query={query}
          />
        </div>
        {endContent && (
          <div className="absolute right-0 z-[3]">{endContent}</div>
        )}
      </div>
    )
  },
)
QueryBar.displayName = 'QueryBar'
