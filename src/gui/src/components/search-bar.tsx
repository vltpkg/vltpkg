import { useEffect, useRef, type ChangeEvent } from 'react'
import { Input } from '@/components/ui/input.jsx'
import { useGraphStore } from '@/state/index.js'

interface SearchBarProps {
  className?: string
  tabIndex?: number
  startContent?: React.ReactNode
  endContent?: React.ReactNode
}

export const SearchBar = ({
  className,
  tabIndex,
  startContent,
  endContent,
}: SearchBarProps) => {
  const updateQuery = useGraphStore(state => state.updateQuery)
  const query = useGraphStore(state => state.query)
  const inputRef = useRef<HTMLInputElement>(null)

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
      <Input
        type="text"
        role="search"
        tabIndex={tabIndex}
        ref={inputRef}
        className={`${className} ${startContent ? 'pl-10' : ''}`}
        placeholder="Query Lookup, e.g: :root > *"
        value={query}
        onChange={(e: ChangeEvent) => {
          const value = (e.currentTarget as HTMLInputElement).value
          updateQuery(value)
        }}
      />
      {endContent && (
        <div className="absolute right-0">{endContent}</div>
      )}
    </div>
  )
}
