import { useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  ArrowUp,
  ArrowDown,
  CornerDownLeft,
  Loader2,
} from 'lucide-react'
import { Input } from '@/components/ui/input.tsx'
import { Button } from '@/components/ui/button.tsx'
import { useSearchStore } from '@/state/search.ts'
import { useDebounce } from '@/components/hooks/use-debounce.tsx'
import { SearchResult } from '@/components/search/search-result.tsx'
import { cn } from '@/lib/utils.ts'

import type { ComponentProps } from 'react'
import type { MotionProps } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'

const MotionInput = motion.create(Input)
const MotionButton = motion.create(Button)

interface SearchBarProps {
  className?: string
}

export const SearchBar = ({ className }: SearchBarProps) => {
  const wrapperRef = useRef<HTMLDivElement>(null)

  return (
    <div
      ref={wrapperRef}
      id="search-bar-wrapper"
      className="relative flex flex-col">
      <SearchInput className={className} />
      <SearchBarModal wrapperRef={wrapperRef} />
    </div>
  )
}

type SearchInputProps = ComponentProps<'div'>

const SearchInput = ({ className }: SearchInputProps) => {
  const navigate = useNavigate()
  const hasResults = useSearchStore(state => state.hasResults)
  const searchTerm = useSearchStore(state => state.searchTerm)
  const setSearchTerm = useSearchStore(state => state.setSearchTerm)
  const searchResults = useSearchStore(state => state.searchResults)
  const selectedIndex = useSearchStore(state => state.selectedIndex)
  const setSelectedIndex = useSearchStore(
    state => state.setSelectedIndex,
  )
  const setHasResults = useSearchStore(state => state.setHasResults)
  const isLoading = useSearchStore(state => state.isLoading)
  const performSearch = useSearchStore(state => state.performSearch)
  const [_, setSearchParams] = useSearchParams()

  // Debounce the search term
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  // sync search term with URL query params
  useEffect(() => {
    if (searchTerm) {
      setSearchParams({ q: searchTerm }, { replace: true })
    } else {
      setSearchParams({}, { replace: true })
    }
  }, [searchTerm, setSearchParams])

  // Perform search when debounced term changes
  useEffect(() => {
    void performSearch(debouncedSearchTerm)
  }, [debouncedSearchTerm, performSearch])

  const handleInputClick = () => {
    // open modal if there are search results and it's currently closed
    if (searchResults.length > 0 && !hasResults) {
      setHasResults(true)
    }
  }

  const handleButtonClick = () => {
    // when modal is open, behave the same as pressing Enter
    if (hasResults && searchResults.length > 0) {
      if (selectedIndex === -1) {
        // no result selected - navigate to results page
        if (searchTerm) {
          window.location.href = `/search?q=${encodeURIComponent(searchTerm)}`
        }
      } else if (searchResults[selectedIndex]) {
        // result selected - navigate to explorer
        const pkg = searchResults[selectedIndex].package
        void navigate(`/explore/npm/${encodeURIComponent(pkg.name)}`)
        setHasResults(false)
      }
    } else if (hasResults || searchTerm) {
      // clear search when modal is closed but has content
      setSearchTerm('')
      setHasResults(false)
    }
  }

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (!hasResults || searchResults.length === 0) {
      if (e.key === 'Escape') {
        e.preventDefault()
        setSearchTerm('')
        setHasResults(false)
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        // if no selection (-1), start at 0, otherwise move down
        if (selectedIndex === -1) {
          setSelectedIndex(0)
        } else {
          setSelectedIndex(
            Math.min(selectedIndex + 1, searchResults.length - 1),
          )
        }
        break
      case 'ArrowUp':
        e.preventDefault()
        // move up, but stop at -1 (no selection)
        setSelectedIndex(Math.max(selectedIndex - 1, -1))
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex === -1) {
          // no result selected - navigate to results page
          if (searchTerm) {
            window.location.href = `/search?q=${encodeURIComponent(searchTerm)}`
          }
        } else if (searchResults[selectedIndex]) {
          // result selected - navigate to explorer
          const pkg = searchResults[selectedIndex].package
          void navigate(
            `/explore/npm/${encodeURIComponent(pkg.name)}`,
          )
          setHasResults(false)
        }
        break
      case 'Escape':
        e.preventDefault()
        setHasResults(false)
        break
    }
  }

  return (
    <motion.div
      className={cn(
        'relative flex items-center justify-center',
        className,
      )}
      initial={false}
      animate={{
        width:
          hasResults ?
            window.innerWidth >= 768 ?
              '35rem'
            : '30rem'
          : '24rem',
      }}>
      <MotionInput
        placeholder="Search"
        animate={{
          borderRadius: hasResults ? '1.2rem 1.2rem 0 0 ' : '1.2rem',
        }}
        value={searchTerm}
        onChange={e => setSearchTerm(e.currentTarget.value)}
        onClick={handleInputClick}
        onKeyDown={handleKeyDown}
        className="h-10 bg-white focus-visible:ring-[0]"
      />
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            className="absolute right-11 flex items-center justify-center">
            <Loader2 className="text-muted-foreground size-4 animate-spin" />
          </motion.div>
        )}
      </AnimatePresence>
      <MotionButton
        animate={{
          borderRadius:
            hasResults ? '1.2rem 1.2rem 0 1.2rem ' : '1.2rem',
        }}
        size="sm"
        variant="ghost"
        onClick={handleButtonClick}
        className="border-muted text-muted-foreground absolute right-0.5 size-9 rounded-full border p-0 [&>svg]:size-7">
        <Search />
      </MotionButton>
    </motion.div>
  )
}

const modalMotion: MotionProps = {
  initial: {
    opacity: 0,
    width: '24rem',
    height: 0,
    scale: 0.99,
    filter: 'blur(4px)',
  },
  animate: {
    opacity: 1,
    width: window.innerWidth >= 768 ? '35rem' : '30rem',
    height: '300px',
    scale: 1,
    filter: 'blur(0px)',
  },
  exit: {
    opacity: 0,
    width: '24rem',
    height: 0,
    scale: 0.99,
    filter: 'blur(4px)',
  },
}

interface SearchBarModalProps {
  wrapperRef: React.RefObject<HTMLDivElement>
}

const SearchBarModal = ({ wrapperRef }: SearchBarModalProps) => {
  const hasResults = useSearchStore(state => state.hasResults)
  const searchResults = useSearchStore(state => state.searchResults)
  const isLoading = useSearchStore(state => state.isLoading)
  const error = useSearchStore(state => state.error)
  const selectedIndex = useSearchStore(state => state.selectedIndex)
  const setHasResults = useSearchStore(state => state.setHasResults)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const selectedItemRef = useRef<HTMLDivElement>(null)

  // handle click outside to close modal
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node) &&
        hasResults
      ) {
        setHasResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [hasResults, setHasResults, wrapperRef])

  // auto-scroll to keep selected item in view
  useEffect(() => {
    if (selectedItemRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current
      const item = selectedItemRef.current
      const containerTop = container.scrollTop
      const containerBottom = containerTop + container.clientHeight
      const itemTop = item.offsetTop
      const itemBottom = itemTop + item.offsetHeight

      if (itemTop < containerTop) {
        // if above visible area
        container.scrollTop = itemTop - 8 // padding
      } else if (itemBottom > containerBottom) {
        // if below visible area
        container.scrollTop = itemBottom - container.clientHeight + 8 // padding
      }
    }
  }, [selectedIndex])

  return (
    <AnimatePresence>
      {hasResults && (
        <motion.div
          {...modalMotion}
          className="border-muted absolute top-10 z-[4] flex h-[300px] w-[35rem] flex-col rounded-2xl rounded-t-none border border-t-[0px] bg-white dark:bg-neutral-900">
          <div
            ref={scrollContainerRef}
            className="flex max-h-[calc(300px-36px)] grow flex-col gap-4 overflow-y-scroll px-4 py-2">
            {isLoading ?
              <div className="flex h-full items-center justify-center">
                <p className="text-muted-foreground text-sm">
                  Searching packages...
                </p>
              </div>
            : error ?
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-red-500">{error}</p>
              </div>
            : searchResults.length > 0 ?
              searchResults.map((result, idx) => (
                <SearchResult
                  key={`search-${idx}`}
                  item={result}
                  isSelected={idx === selectedIndex}
                  ref={idx === selectedIndex ? selectedItemRef : null}
                />
              ))
            : <div className="flex h-full items-center justify-center">
                <p className="text-muted-foreground text-sm">
                  No packages found
                </p>
              </div>
            }
          </div>
          <SearchLegend />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

interface LegendItem {
  icon: LucideIcon[] | LucideIcon | string
  label: string
}

const SearchLegend = () => {
  const selectedIndex = useSearchStore(state => state.selectedIndex)

  const legendItems: LegendItem[] = [
    {
      label: 'Navigate',
      icon: [ArrowUp, ArrowDown],
    },
    {
      label: selectedIndex === -1 ? 'View all results' : 'Go to',
      icon: CornerDownLeft,
    },
    {
      label: 'Close',
      icon: 'Esc',
    },
  ]

  return (
    <div className="border-muted flex items-center justify-end gap-4 rounded-b-2xl border-t bg-neutral-100/50 px-4 py-2 dark:bg-neutral-900">
      {legendItems.map((item, idx) => {
        return (
          <div
            key={`search-legend-${item.label}-${idx}`}
            className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {Array.isArray(item.icon) ?
                item.icon.map((Icon, idx) => (
                  <div
                    key={`${item.label}-icon-${idx}`}
                    className="border-muted flex size-4 items-center justify-center rounded-sm border bg-white dark:bg-neutral-950 [&_svg]:size-3">
                    <Icon className="text-muted-foreground" />
                  </div>
                ))
              : typeof item.icon === 'string' ?
                <div className="border-muted flex h-4 items-center justify-center rounded-sm border bg-white px-2 dark:bg-neutral-950">
                  <span className="text-muted-foreground font-mono text-xs">
                    {item.icon}
                  </span>
                </div>
              : <div className="border-muted flex size-4 items-center justify-center rounded-sm border bg-white dark:bg-neutral-950 [&_svg]:size-3">
                  <item.icon className="text-muted-foreground" />
                </div>
              }
            </div>
            <span className="text-muted-foreground text-sm font-medium">
              {item.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
