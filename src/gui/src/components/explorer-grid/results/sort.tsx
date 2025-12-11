import { useRef, useEffect, useState, forwardRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Layers,
  SendToBack,
  List,
  GalleryVerticalEnd,
  Blocks,
} from 'lucide-react'
import { Button } from '@/components/ui/button.tsx'
import { useResultsStore } from '@/components/explorer-grid/results/context.tsx'
import { cn } from '@/lib/utils.ts'

import type { ComponentProps } from 'react'
import type { LucideIcon } from 'lucide-react'
import type { MotionProps } from 'framer-motion'
import type {
  ResultsSortDir,
  ResultsSortBy,
} from '@/components/explorer-grid/results/context.tsx'

interface SortOption {
  label: string
  value: ResultsSortBy
  icon: LucideIcon
}

const sortOptions: SortOption[] = [
  {
    label: 'Alphabetical',
    value: 'alphabetical' as const,
    icon: List,
  },
  {
    label: 'Version',
    value: 'version' as const,
    icon: Layers,
  },
  {
    label: 'Dependency type',
    value: 'dependencyType' as const,
    icon: SendToBack,
  },
  {
    label: 'Dependents',
    value: 'dependents' as const,
    icon: GalleryVerticalEnd,
  },
  {
    label: 'Module type',
    value: 'moduleType' as const,
    icon: Blocks,
  },
]

export const ResultsSort = ({
  className,
  ...props
}: ComponentProps<typeof SortMenu>) => {
  const sortBy = useResultsStore(state => state.sortBy)
  const sortDir = useResultsStore(state => state.sortDir)
  const setSort = useResultsStore(state => state.setSort)
  const setSortDir = useResultsStore(state => state.setSortDir)
  const results = useResultsStore(state => state.allItems)

  const noResults = results.length === 0

  const handleSetSort = (key: ResultsSortBy) => {
    if (sortBy !== key) {
      // Use atomic setSort to avoid double sorting
      setSort(key, 'asc')
    } else {
      setSortDir(sortDir === 'desc' ? 'asc' : 'desc')
    }
  }

  const listRef = useRef<HTMLUListElement>(null)
  const [isAtStart, setIsAtStart] = useState(true)
  const [isAtEnd, setIsAtEnd] = useState(false)

  useEffect(() => {
    const listElement = listRef.current
    if (!listElement) return

    const updateScrollState = () => {
      const { scrollLeft, scrollWidth, clientWidth } = listElement
      setIsAtStart(scrollLeft <= 0)
      setIsAtEnd(scrollLeft >= scrollWidth - clientWidth - 1) // -1 for rounding
    }

    // Initial check
    updateScrollState()

    // Listen to scroll events
    listElement.addEventListener('scroll', updateScrollState)

    // Listen to resize events (in case content changes)
    const resizeObserver = new ResizeObserver(updateScrollState)
    resizeObserver.observe(listElement)

    return () => {
      listElement.removeEventListener('scroll', updateScrollState)
      resizeObserver.disconnect()
    }
  }, [])

  const scrollToStart = () => {
    const listElement = listRef.current
    if (listElement) {
      listElement.scrollTo({ left: 0, behavior: 'smooth' })
    }
  }

  const scrollToEnd = () => {
    const listElement = listRef.current
    if (listElement) {
      const { scrollWidth, clientWidth } = listElement
      listElement.scrollTo({
        left: scrollWidth - clientWidth,
        behavior: 'smooth',
      })
    }
  }

  return (
    <SortMenu className={cn('relative', className)} {...props}>
      <AnimatePresence>
        {!isAtStart && (
          <MotionScrollHelper
            align="start"
            onClick={scrollToStart}
            {...scrollHelperMotion}>
            <ChevronLeft />
          </MotionScrollHelper>
        )}
      </AnimatePresence>
      <SortMenuContent
        ref={listRef}
        className="flex flex-col gap-px rounded lg:flex-row lg:overflow-x-scroll lg:[-ms-overflow-style:none] lg:[scrollbar-width:none] lg:[&::-webkit-scrollbar]:hidden">
        {sortOptions.map((option, idx) => (
          <SortMenuItem
            key={`${option.label}-${idx}`}
            {...option}
            sortDir={sortDir}
            isActive={sortBy === option.value}
            onClick={() => handleSetSort(option.value)}
            disabled={noResults}>
            {option.label}
          </SortMenuItem>
        ))}
      </SortMenuContent>
      <AnimatePresence>
        {!isAtEnd && (
          <MotionScrollHelper
            align="end"
            onClick={scrollToEnd}
            {...scrollHelperMotion}>
            <ChevronRight />
          </MotionScrollHelper>
        )}
      </AnimatePresence>
    </SortMenu>
  )
}

const SortMenu = ({ className, ...props }: ComponentProps<'nav'>) => {
  return <nav className={cn('', className)} {...props} />
}

const SortMenuContent = forwardRef<
  HTMLUListElement,
  ComponentProps<'ul'>
>(({ className, ...props }, ref) => {
  return <ul ref={ref} className={cn('', className)} {...props} />
})
SortMenuContent.displayName = 'SortMenuContent'

type SortMenuItemProps = ComponentProps<'li'> &
  Omit<SortOption, 'label'> & {
    isActive: boolean
    sortDir: ResultsSortDir
    disabled?: boolean
  }

const SortMenuItem = ({
  className,
  children,
  icon: Icon,
  isActive,
  sortDir,
  disabled = false,
  ...props
}: SortMenuItemProps) => {
  return (
    <li
      data-active={isActive}
      data-sort-direction={
        isActive ?
          sortDir === 'asc' ?
            'asc'
          : 'desc'
        : undefined
      }
      data-slot="sort-menu-item"
      className={cn(
        'group flex h-full w-full min-w-[200px] items-center justify-center rounded',
        'bg-background',
        className,
      )}
      {...props}>
      <button
        data-slot="sort-menu-button"
        className={cn(
          'hover:text-foreground hover:bg-background-secondary bg-background text-muted-foreground inline-flex h-full w-full cursor-pointer items-center justify-center rounded px-6 py-3 text-sm font-medium transition-colors duration-100 lg:p-3',
          'group-data-[active=true]:text-foreground group-data-[active=true]:bg-foreground/10',
          disabled && 'cursor-not-allowed opacity-50',
        )}>
        <Icon data-slot="icon" className="size-4" />
        <span className="ml-2">{children}</span>
        <div
          className={cn(
            'ml-auto inline-flex flex-col items-center justify-center',
            '[&_svg]:size-3 [&_svg]:transition-colors [&_svg]:duration-100',
            'group-data-[sort-direction=asc]:[&_>[data-slot=sort-menu-desc]]:text-muted-foreground group-data-[sort-direction=asc]:[&_>[data-slot=sort-menu-asc]]:text-foreground',
            'group-data-[sort-direction=desc]:[&_>[data-slot=sort-menu-asc]]:text-muted-foreground group-data-[sort-direction=desc]:[&_>[data-slot=sort-menu-desc]]:text-foreground',
          )}>
          <ChevronUp data-slot="sort-menu-asc" />
          <ChevronDown data-slot="sort-menu-desc" />
        </div>
      </button>
    </li>
  )
}

const scrollHelperMotion: MotionProps = {
  initial: { opacity: 0, filter: 'blur(2px)' },
  animate: { opacity: 1, filter: 'blur(0px)' },
  exit: { opacity: 0, filter: 'blur(2px)' },
}

const ScrollHelper = forwardRef<
  HTMLButtonElement,
  ComponentProps<typeof Button> & { align: 'start' | 'end' }
>(({ className, align, ...props }, ref) => {
  return (
    <Button
      ref={ref}
      variant="ghost"
      className={cn(
        'bg-background/50 absolute z-[10] flex aspect-square h-full items-center justify-center rounded backdrop-blur-sm [&_svg]:size-4',
        align === 'start' && 'top-0 left-0',
        align === 'end' && 'top-0 right-0',
        className,
      )}
      {...props}
    />
  )
})
ScrollHelper.displayName = 'ScrollHelper'

const MotionScrollHelper = motion.create(ScrollHelper)
