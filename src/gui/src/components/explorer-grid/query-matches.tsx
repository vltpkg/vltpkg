import { NavLink, useNavigate } from 'react-router'
import { useMemo } from 'react'
import { useGraphStore } from '@/state/index.ts'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover.tsx'
import {
  Tooltip,
  TooltipProvider,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip.tsx'
import { LabelBadge } from '@/components/labels/label-badge.tsx'
import { cn } from '@/lib/utils.ts'

import type { SavedQuery } from '@/state/types.ts'

export const QueryMatches = () => {
  const savedQueries = useGraphStore(state => state.savedQueries)
  const activeQuery = useGraphStore(state => state.query)
  const matchedQueries = useMemo(
    () =>
      savedQueries?.filter(query => query.query === activeQuery) ??
      [],
    [savedQueries, activeQuery],
  )

  return (
    <>
      <LabelTags className="mr-1" queries={matchedQueries} />
      {matchedQueries.length > 1 && matchedQueries[0] && (
        <Notification
          className="mr-2"
          query={matchedQueries[0].query}
          numberOfQueries={matchedQueries.length}
        />
      )}
    </>
  )
}

const LabelTags = ({
  queries,
  className,
}: {
  queries: SavedQuery[]
  className?: string
}) => {
  const navigate = useNavigate()

  const navigateToLabel = (labelName: string) => {
    void navigate(`/labels?name=${encodeURIComponent(labelName)}`)
  }

  const dedupedLabels = useMemo(() => {
    const seen = new Set<string>()
    return queries
      .flatMap(q => q.labels ?? [])
      .filter(label => {
        const key = label.name
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
  }, [queries])

  return (
    <Popover>
      <PopoverTrigger className="flex items-center justify-center">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger
              asChild
              className="flex items-center justify-center">
              <div className={cn('flex -space-x-2', className)}>
                {dedupedLabels.map((label, idx) => (
                  <div
                    className="inline-block size-4 rounded-full border border-[1px] border-white dark:border-neutral-800"
                    key={idx}
                    style={{
                      backgroundColor: label.color,
                    }}
                  />
                ))}
              </div>
            </TooltipTrigger>
            <TooltipContent>Labels</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </PopoverTrigger>
      <PopoverContent className="rounded-xl">
        <div className="flex flex-col gap-2">
          <p className="font-medium">Labels</p>
          <div className="flex flex-wrap gap-2">
            {dedupedLabels.map((label, idx) => (
              <button
                onClick={() => navigateToLabel(label.name)}
                key={idx}>
                <LabelBadge name={label.name} color={label.color} />
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

const Notification = ({
  numberOfQueries,
  className,
  query,
}: {
  numberOfQueries: number
  className?: string
  query: string
}) => {
  return (
    <NavLink
      to={`/queries?query=${encodeURIComponent(query)}`}
      className={cn(
        'text-xxs dark:bg-muted h-6 cursor-pointer items-center justify-center rounded-md border border-neutral-200 bg-neutral-100 px-2 py-1 transition-colors dark:border-neutral-700',
        className,
      )}>
      Matches {numberOfQueries} Queries
    </NavLink>
  )
}
