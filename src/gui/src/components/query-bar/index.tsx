import { useEffect, useRef } from 'react'
import type { ChangeEvent } from 'react'
import { Input } from '@/components/ui/input.jsx'
import { QueryHighlighter } from '@/components/query-bar/query-highlighter.jsx'
import {
  QueryBarProvider,
  useQueryBar,
} from '@/components/query-bar/context.jsx'
import { Search, Command } from 'lucide-react'
import { Kbd } from '@/components/ui/kbd.jsx'
import { QueryMatches } from '@/components/explorer-grid/query-matches.jsx'
import SaveQuery from '@/components/explorer-grid/save-query.jsx'
import { QueryError } from '@/components/query-bar/query-error.jsx'
import { cn } from '@/lib/utils.js'

const QueryInput = () => {
  const inputRef = useRef<HTMLInputElement>(null)
  const { query, updateQuery, queryError } = useQueryBar()

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
  return (
    <Input
      type="text"
      role="search"
      autoCorrect="off"
      autoComplete="off"
      autoCapitalize="off"
      ref={inputRef}
      className={cn(
        'duration-250 relative w-full bg-transparent bg-white pl-10 text-sm text-transparent caret-black outline transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:bg-muted-foreground/5 dark:caret-white',
        queryError &&
          'outline-2 outline-offset-2 outline-red-500 focus-visible:ring-red-500',
      )}
      placeholder="Query Lookup, e.g: :root > *"
      value={query}
      onChange={(e: ChangeEvent) => {
        const value = (e.currentTarget as HTMLInputElement).value
        updateQuery(value)
      }}
    />
  )
}

export const QueryBar = () => {
  return (
    <QueryBarProvider>
      <div className="relative flex grow items-center">
        <div className="absolute pr-8">
          <Search size={20} className="ml-3 text-neutral-500" />
        </div>
        <div className="relative w-full">
          <QueryInput />
          <QueryHighlighter />
        </div>
        <QueryError />
        <div className="absolute right-0">
          <div className="mr-3 hidden items-center gap-1 backdrop-blur-sm md:flex">
            <QueryMatches />
            <SaveQuery />
            <Kbd className='before:content-[" "] relative ml-3 before:absolute before:-ml-10 before:h-[0.75rem] before:w-[1.25px] before:rounded-sm before:bg-neutral-600'>
              <Command size={12} />
            </Kbd>
            <Kbd className="text-sm">k</Kbd>
          </div>
        </div>
      </div>
    </QueryBarProvider>
  )
}
