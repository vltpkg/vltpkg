import { Button } from '@/components/ui/button.tsx'
import {
  ChevronUp,
  ChevronDown,
  Layers,
  SendToBack,
  CircleGauge,
  List,
  GalleryVerticalEnd,
  Blocks,
} from 'lucide-react'
import { useResultsStore } from '@/components/explorer-grid/results/context.tsx'
import { cn } from '@/lib/utils.ts'

import type { LucideIcon } from 'lucide-react'
import type { ResultsSortBy } from '@/components/explorer-grid/results/context.tsx'

interface SortOption {
  label: string
  key: ResultsSortBy
  icon: LucideIcon
}

const sortOptions: SortOption[] = [
  {
    label: 'Alphabetical',
    key: 'alphabetical' as const,
    icon: List,
  },
  {
    label: 'Version',
    key: 'version' as const,
    icon: Layers,
  },
  {
    label: 'Dependency type',
    key: 'dependencyType' as const,
    icon: SendToBack,
  },
  {
    label: 'Dependents',
    key: 'dependents' as const,
    icon: GalleryVerticalEnd,
  },
  {
    label: 'Module type',
    key: 'moduleType' as const,
    icon: Blocks,
  },
  {
    label: 'Overall score',
    key: 'overallScore' as const,
    icon: CircleGauge,
  },
]

export const ResultsSort = () => {
  const sortBy = useResultsStore(state => state.sortBy)
  const sortDir = useResultsStore(state => state.sortDir)
  const setSortBy = useResultsStore(state => state.setSortBy)
  const setSortDir = useResultsStore(state => state.setSortDir)
  const defaultDirFor = (key: ResultsSortBy) =>
    key === 'dependents' || key === 'overallScore' ? 'desc' : 'asc'
  const toggleDir = () =>
    setSortDir(sortDir === 'asc' ? 'desc' : 'asc')

  return (
    <div className="flex gap-2 overflow-x-auto">
      {sortOptions.map((o, idx) => {
        const isActive = sortBy === o.key
        return (
          <Button
            key={`${o.label}-${idx}`}
            variant="outline"
            size="sm"
            onClick={() => {
              if (!isActive) {
                setSortBy(o.key)
                return
              }
              // if active and at default direction -> switch to opposite
              const isDefault = sortDir === defaultDirFor(o.key)
              if (isDefault) {
                toggleDir()
                return
              }
              // if active and not default -> turn off
              setSortBy('none' as ResultsSortBy)
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
