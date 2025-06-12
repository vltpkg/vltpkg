import { NavLink, useNavigate } from 'react-router'
import type { SavedQuery } from '@/state/types.ts'
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

const QueryMatches = () => {
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
  className = '',
}: {
  queries: SavedQuery[]
  className?: string
}) => {
  const navigate = useNavigate()

  const navigateToLabel = (labelName: string) => {
    void navigate(`/labels?name=${encodeURIComponent(labelName)}`)
  }

  return (
    <Popover>
      <PopoverTrigger className="flex items-center justify-center">
        <Tooltip>
          <TooltipProvider>
            <TooltipTrigger
              asChild
              className="flex items-center justify-center">
              <div className={`flex -space-x-2 ${className}`}>
                {queries.map(query => {
                  if (!query.labels?.length) return null

                  return query.labels.map((label, idx) => (
                    <div
                      className="inline-block size-4 rounded-full ring-1 ring-muted"
                      key={idx}
                      style={{
                        backgroundColor: label.color,
                        borderColor: label.color,
                      }}
                    />
                  ))
                })}
              </div>
            </TooltipTrigger>
            <TooltipContent>Labels</TooltipContent>
          </TooltipProvider>
        </Tooltip>
      </PopoverTrigger>
      <PopoverContent>
        <p className="mb-2 font-semibold">Labels</p>
        <div className="flex flex-wrap gap-2">
          {queries.map(query => {
            if (!query.labels?.length) return null

            return query.labels.map((label, idx) => (
              <button
                onClick={() => navigateToLabel(label.name)}
                key={idx}>
                <LabelBadge name={label.name} color={label.color} />
              </button>
            ))
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// need to pass the query as a URL Param
const Notification = ({
  numberOfQueries,
  className = '',
  query,
}: {
  numberOfQueries: number
  className?: string
  query: string
}) => {
  return (
    <NavLink
      to={`/queries?query=${encodeURIComponent(query)}`}
      className={`flex h-[1.5rem] cursor-pointer items-center justify-center rounded-sm border border-muted-foreground/20 bg-muted px-2 py-1 text-[10px] transition-all ${className}`}>
      Matches {numberOfQueries} Queries
    </NavLink>
  )
}

export { QueryMatches }
