import { Button } from '@/components/ui/button.tsx'
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

interface SortOption {
  label: string
  key: SearchResultsSortBy
  icon: LucideIcon
}

const sortOptions: SortOption[] = [
  {
    label: 'Relevance',
    key: 'relevance' as const,
    icon: Sparkles,
  },
  {
    label: 'Popularity',
    key: 'popularity' as const,
    icon: TrendingUp,
  },
  {
    label: 'Quality',
    key: 'quality' as const,
    icon: Shield,
  },
  {
    label: 'Maintenance',
    key: 'maintenance' as const,
    icon: Wrench,
  },
  {
    label: 'Published Date',
    key: 'date' as const,
    icon: Calendar,
  },
]

export const SearchResultsSort = () => {
  const sortBy = useSearchResultsStore(state => state.sortBy)
  const sortDir = useSearchResultsStore(state => state.sortDir)
  const setSortBy = useSearchResultsStore(state => state.setSortBy)
  const setSortDir = useSearchResultsStore(state => state.setSortDir)

  // Default direction for each sort type
  const defaultDirFor = (): SearchResultsSortDir => {
    return 'desc'
  }

  return (
    <div className="flex flex-wrap gap-2 overflow-x-auto">
      {sortOptions.map((o, idx) => {
        const isActive = sortBy === o.key
        const defaultDir = defaultDirFor()
        return (
          <Button
            key={`${o.label}-${idx}`}
            variant="outline"
            size="sm"
            onClick={() => {
              if (!isActive) {
                // First click: activate with default direction
                setSortBy(o.key)
                return
              }
              // If active and at default direction -> switch to opposite
              const isDefault = sortDir === defaultDir
              if (isDefault) {
                setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
                return
              }
              // If active and not default -> turn off (return to relevance)
              setSortBy('relevance')
            }}
            className={cn(
              '[&_svg]:text-muted-foreground inline-flex items-center gap-3 disabled:opacity-50',
              'rounded-xl border text-sm transition-colors duration-150',
              'border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-100',
              'dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700 dark:hover:bg-neutral-800',
              isActive &&
                '[&>.option-icon]:text-foreground border-neutral-300 bg-neutral-200 hover:border-neutral-400 hover:bg-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-neutral-600 dark:hover:bg-neutral-700',
            )}>
            <o.icon className="option-icon size-4" />

            <span>{o.label}</span>
            <div
              className={cn(
                'flex flex-col items-center justify-center [&_svg]:size-2.5',
                isActive &&
                  sortDir === 'asc' &&
                  '[&>.ascending]:text-foreground',
                isActive &&
                  sortDir === 'desc' &&
                  '[&>.descending]:text-foreground',
                !isActive && '[&_svg]:opacity-40',
              )}>
              <ChevronUp className="ascending" />
              <ChevronDown className="descending" />
            </div>
          </Button>
        )
      })}
    </div>
  )
}
