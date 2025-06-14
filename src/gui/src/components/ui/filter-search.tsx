import type { SavedQuery } from '@/state/types.ts'
import { useSearchParams } from 'react-router'
import { useEffect, useRef, useState, useMemo } from 'react'
import { Input } from '@/components/ui/input.tsx'
import { Kbd } from '@/components/ui/kbd.tsx'
import { Command, Search } from 'lucide-react'

interface FilterSearchProps<T> {
  items: T[] | undefined
  setFilteredItems: (i: T[]) => void
  placeholder: string
  className?: string
}

const FilterSearch = <T,>({
  items,
  setFilteredItems,
  placeholder,
  className = '',
}: FilterSearchProps<T>) => {
  const [filterText, setFilterText] = useState<string>('')
  const inputRef = useRef<HTMLInputElement>(null)
  const isInitialMount = useRef(true)
  const [searchParams, setSearchParams] = useSearchParams()

  /**
   * Update URL params based on `filterText` after initial load.
   */
  useEffect(() => {
    if (isInitialMount.current) return

    const params = new URLSearchParams(searchParams)
    const itemKeys = items ? Object.keys(items[0] ?? {}) : []

    if (!filterText.trim()) {
      params.forEach((_, key) => params.delete(key))
      setFilteredItems(items ?? [])
    }

    if (filterText.trim() !== '') {
      params.forEach((_, key) => params.delete(key))
      params.set('filter', filterText)
    }

    if (filterText.split('=')[0] === 'label') {
      params.forEach((_, key) => params.delete(key))
      const label = filterText.split('=')[1]
      if (label) {
        params.set('label', label)
      }
    }

    if (itemKeys.some(key => filterText.includes(key))) {
      params.forEach((_, key) => params.delete(key))
      const [key, value] = filterText.split('=')
      if (key && value) {
        params.set(key, value)
      }
    }

    setSearchParams(params)
  }, [
    filterText,
    items,
    searchParams,
    setFilteredItems,
    setSearchParams,
  ])

  /**
   * Sync URL params with filtered items on initial load.
   */
  useEffect(() => {
    const params = new URLSearchParams(searchParams)
    const itemKeys = items ? Object.keys(items[0] ?? {}) : []

    const paramKeys = Array.from(params.keys())

    const matchingKey = paramKeys.find(key => itemKeys.includes(key))

    if (matchingKey) {
      setFilterText(`${matchingKey}=${params.get(matchingKey)}`)
    }

    if (params.get('label')) {
      setFilterText(`label=${params.get('label')?.toLowerCase()}`)
    }

    isInitialMount.current = false
  }, [items, searchParams])

  /**
   * Filter items based on `filterText` or URL params.
   */
  const filteredItems = useMemo(() => {
    if (!items) {
      return []
    }

    const params = new URLSearchParams(searchParams)
    const selectors: { key: string; value: string }[] = []

    for (const [key, value] of params.entries()) {
      selectors.push({ key, value })
    }

    return items.filter(item =>
      selectors.every(selector => {
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
      }),
    )
  }, [items, searchParams])

  // Update the parent component with filtered items
  useEffect(() => {
    setFilteredItems(filteredItems)
  }, [filteredItems, setFilteredItems])

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
    <div
      className={`relative flex w-[384px] items-center ${className}`}>
      <Search
        size={18}
        className="absolute left-0 ml-3 text-neutral-500"
      />
      <Input
        type="text"
        ref={inputRef}
        className="bg-white pl-9 pr-20 dark:bg-muted-foreground/5"
        role="search"
        placeholder={placeholder}
        value={filterText}
        onChange={e => setFilterText(e.target.value)}
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

export { FilterSearch }
