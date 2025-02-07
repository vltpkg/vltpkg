import { useEffect, useRef } from 'react'
import { Search, Command } from 'lucide-react'
import { Kbd } from '@/components/ui/kbd.jsx'
import { Input } from '@/components/ui/input.jsx'

interface TableFilterSearchProps {
  filterValue: string
  onFilterChange: (value: string) => void
  placeholder?: string
}

export const TableFilterSearch = ({
  placeholder = 'Filter Projects',
  filterValue,
  onFilterChange,
}: TableFilterSearchProps) => {
  const inputRef = useRef<HTMLInputElement>(null)

  /**
   * Handle keyboard shortcuts.
   */
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
    <div className="relative flex w-[384px] items-center">
      <Search
        size={18}
        className="absolute left-0 ml-3 text-neutral-500"
      />
      <Input
        type="text"
        ref={inputRef}
        className="pl-9 pr-20"
        role="search"
        placeholder={placeholder}
        value={filterValue}
        onChange={e => onFilterChange(e.target.value)}
      />
      <div className="absolute right-0 flex gap-2">
        <div className="mr-3 hidden items-center gap-1 backdrop-blur-sm md:flex">
          <Kbd>
            <Command size={12} />
          </Kbd>
          <Kbd className="text-sm">k</Kbd>
        </div>
      </div>
    </div>
  )
}
