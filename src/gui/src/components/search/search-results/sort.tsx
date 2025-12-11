import {
  ChevronUp,
  ChevronDown,
  Sparkles,
  TrendingUp,
  Shield,
  Wrench,
  Calendar,
} from 'lucide-react'
import { useSearchResultsStore } from '@/state/search-results.ts'
import { cn } from '@/lib/utils.ts'

import type {
  SearchResultsSortBy,
  SearchResultsSortDir,
} from '@/state/search-results.ts'

import type { LucideIcon } from 'lucide-react'
import type { ComponentProps } from 'react'

interface SortOption {
  label: string
  value: SearchResultsSortBy
  icon: LucideIcon
}

const sortOptions: SortOption[] = [
  {
    label: 'Relevance',
    value: 'relevance' as const,
    icon: Sparkles,
  },
  {
    label: 'Popularity',
    value: 'popularity' as const,
    icon: TrendingUp,
  },
  {
    label: 'Quality',
    value: 'quality' as const,
    icon: Shield,
  },
  {
    label: 'Maintenance',
    value: 'maintenance' as const,
    icon: Wrench,
  },
  {
    label: 'Published',
    value: 'date' as const,
    icon: Calendar,
  },
]

export const SearchResultsSort = ({
  className,
  ...props
}: ComponentProps<typeof SortMenu>) => {
  const sortBy = useSearchResultsStore(state => state.sortBy)
  const sortDir = useSearchResultsStore(state => state.sortDir)
  const setSort = useSearchResultsStore(state => state.setSort)
  const setSortDir = useSearchResultsStore(state => state.setSortDir)
  const isLoading = useSearchResultsStore(state => state.isLoading)
  const results = useSearchResultsStore(state => state.results)

  const noResults = results.length === 0

  const handleSetSort = (key: SearchResultsSortBy) => {
    if (isLoading) return

    if (sortBy !== key) {
      // Use atomic setSort to avoid double sorting
      setSort(key, 'asc')
    } else {
      setSortDir(sortDir === 'desc' ? 'asc' : 'desc')
    }
  }

  return (
    <SortMenu className={className} {...props}>
      <SortMenuContent className="grid grid-cols-1 gap-[1px] rounded lg:grid-cols-5">
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
    </SortMenu>
  )
}

const SortMenu = ({ className, ...props }: ComponentProps<'nav'>) => {
  return <nav className={cn('', className)} {...props} />
}

const SortMenuContent = ({
  className,
  ...props
}: ComponentProps<'ul'>) => {
  return <ul className={cn('', className)} {...props} />
}

type SortMenuItemProps = ComponentProps<'li'> &
  Omit<SortOption, 'label'> & {
    isActive: boolean
    sortDir: SearchResultsSortDir
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
        'group flex h-full w-full items-center justify-center rounded',
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
