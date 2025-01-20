import { type SavedQuery } from '@/state/types.js'
import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input.jsx'
import { Kbd } from '@/components/ui/kbd.jsx'
import { Command, Search } from 'lucide-react'

interface FilterSearchProps<T> {
  items: T[] | undefined
  setFilteredItems: (i: T[]) => void
  placeholder: string
}

const FilterSearch = <T,>({
  items,
  setFilteredItems,
  placeholder,
}: FilterSearchProps<T>) => {
  const [filterText, setFilterText] = useState<string>('')
  const inputRef = useRef<HTMLInputElement>(null)

  /**
   * Initially parse URL params and filter items
   * based on the params.
   */
  useEffect(() => {
    const selectors: { key: string; value: string }[] = []
    const params = new URLSearchParams(window.location.search)

    for (const [key, value] of params.entries()) {
      selectors.push({ key, value })
    }

    if (!items) {
      setFilteredItems([])
      return
    }

    const filteredItems = items.filter(item => {
      return selectors.every(selector => {
        if (selector.key === 'filter') {
          const searchValue = selector.value.toLowerCase()
          return Object.values(item as Record<string, unknown>).some(
            val => String(val).toLowerCase().includes(searchValue),
          )
        } else if (selector.key === 'label') {
          const searchValue = selector.value.toLowerCase()
          const labels = (item as SavedQuery).labels ?? []
          return labels.some(label =>
            label.name.toLowerCase().includes(searchValue),
          )
        } else {
          const itemValue = String(
            item[selector.key as keyof T] || '',
          ).toLowerCase()
          const selectorValue = selector.value.toLowerCase()
          return itemValue === selectorValue
        }
      })
    })

    setTimeout(() => {
      setFilteredItems(filteredItems)
    }, 0)
  }, [items, window.location.search])

  /**
   * Handle setting the params in the url when filterText changs
   */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)

    if (filterText) {
      params.set('filter', filterText)
    } else {
      params.delete('filter')
    }

    if (filterText.trim() === '') {
      setFilteredItems(items ?? [])
      return
    }

    const newUrl = `${window.location.pathname}?${params.toString()}`
    window.history.replaceState({}, '', newUrl)
  }, [filterText])

  /**
   * Handle the search input accessibility
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
        value={filterText}
        onChange={e => setFilterText(e.target.value)}
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

export { FilterSearch }
