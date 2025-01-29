import { useEffect, useRef } from 'react'
import { Search, Command } from 'lucide-react'
import { Kbd } from '@/components/ui/kbd.jsx'
import { Input } from '@/components/ui/input.jsx'

interface TableFilterSearchProps {
  filterValue: string
  onFilterChange: (value: string) => void
  placeholder?: string
}

const TableFilterSearch = ({
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
    <div className="relative flex items-center w-[384px]">
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
      <div className="flex gap-2 absolute right-0">
        <div className="items-center hidden md:flex gap-1 mr-3 backdrop-blur-sm">
          <Kbd>
            <Command size={12} />
          </Kbd>
          <Kbd className="text-sm">k</Kbd>
        </div>
      </div>
    </div>
  )
}

export { TableFilterSearch }
