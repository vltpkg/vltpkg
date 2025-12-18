import { forwardRef, useEffect, useRef, useMemo } from 'react'
import { useGraphStore } from '@/state/index.ts'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group.tsx'
import { Query } from '@vltpkg/query'
import { QueryHighlighter } from '@/components/query-bar/query-highlighter.tsx'
import { useKeyDown } from '@/components/hooks/use-keydown.tsx'
import { cn } from '@/lib/utils.ts'

import type { ReactNode, ComponentProps } from 'react'
import type { ParsedSelectorToken } from '@vltpkg/query'

interface QueryBar extends ComponentProps<'div'> {
  tabIndex?: number
  startContent?: ReactNode
  endContent?: ReactNode
  classNames?: {
    wrapper?: string
    input?: string
  }
}

export const QUERY_BAR_ID = 'query-bar'

export const QueryBar = forwardRef<HTMLDivElement, QueryBar>(
  (
    {
      classNames,
      className,
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

    const { wrapper: wrapperCn, input: inputCn } = classNames ?? {}

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

    useKeyDown(['meta+k', 'ctrl+k'], () => inputRef.current?.focus())
    useKeyDown(['escape'], () => inputRef.current?.blur())

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
      <InputGroup
        ref={ref}
        id={QUERY_BAR_ID}
        className={cn(
          'relative z-51 rounded-xl',
          className,
          wrapperCn,
        )}
        {...rest}>
        {startContent && (
          <InputGroupAddon align="inline-start">
            {startContent}
          </InputGroupAddon>
        )}
        <InputGroupInput
          ref={inputRef}
          onFocus={onFocus}
          onBlur={onBlur}
          type="text"
          role="search"
          tabIndex={tabIndex}
          autoCorrect="off"
          autoComplete="off"
          autoCapitalize="off"
          placeholder="Query Lookup, e.g: :root > *"
          value={query}
          onChange={e => updateQuery(e.currentTarget.value)}
          className={cn(
            'text-transparent caret-black dark:caret-white',
            inputCn,
          )}
        />
        {endContent && (
          <InputGroupAddon
            disableParentFocus
            align="inline-end"
            className="pr-2">
            {endContent}
          </InputGroupAddon>
        )}
        <QueryHighlighter
          parsedTokens={parsedTokens}
          ref={queryHighlighterRef}
          query={query}
        />
      </InputGroup>
    )
  },
)

QueryBar.displayName = 'QueryBar'
