import { type SavedQuery } from '@/state/types.js'
import { useEffect, useState } from 'react'
import { useGraphStore } from '@/state/index.js'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover.jsx'
import {
  Tooltip,
  TooltipProvider,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip.jsx'
import { LabelBadge } from '@/components/labels/label-badge.jsx'

const QueryMatches = () => {
  const savedQueries = useGraphStore(state => state.savedQueries)
  const activeQuery = useGraphStore(state => state.query)
  const [matchedQueries, setMatchedQueries] = useState<SavedQuery[]>(
    [],
  )

  useEffect(() => {
    const checkMatchedQueries = () => {
      if (savedQueries && savedQueries.length !== 0) {
        const filteredQueries = savedQueries.filter(
          query => query.query === activeQuery,
        )
        setMatchedQueries(filteredQueries)
      }
    }

    checkMatchedQueries()
  }, [savedQueries, activeQuery])

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
  const navigateToLabel = (labelName: string) => {
    window.location.href =
      '/labels?name=' + encodeURIComponent(labelName)
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
                  if (!query.labels || query.labels.length === 0)
                    return null

                  return query.labels.map((label, idx) => (
                    <div
                      className="inline-block size-4 rounded-full ring-muted ring-1"
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
        <p className="font-semibold mb-2">Labels</p>
        <div className="flex flex-wrap gap-2">
          {queries.map(query => {
            if (!query.labels || query.labels.length === 0)
              return null

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
    <a
      href={`/queries?query=${encodeURIComponent(query)}`}
      className={`cursor-pointer text-[10px] flex items-center h-[1.5rem] justify-center bg-muted transition-all border border-muted-foreground/20 px-2 py-1 rounded-sm ${className}`}>
      Matches {numberOfQueries} Queries
    </a>
  )
}

export { QueryMatches }
