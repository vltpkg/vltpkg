import { useEffect, useState } from 'react'
import { ChevronRight, Search, CornerDownRight } from 'lucide-react'
import { Button } from '@/components/ui/button.tsx'
import { Query } from '@vltpkg/query'
import { QueryToken } from '@/components/query-bar/query-token.tsx'
import { useGraphStore } from '@/state/index.ts'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/utils.ts'

interface SuggestedQuery {
  name: string
  description: string
  query: string
}

export const queries: SuggestedQuery[] = [
  {
    name: 'Outdated',
    description: 'Find packages that are outdated',
    query: ':outdated(major)',
  },
  {
    name: 'Unmaintained',
    query: ':unmaintained',
    description: 'Find packages that are unmaintained',
  },
  {
    name: 'System access',
    query: ':is(:fs, :env)',
    description:
      'Find packages with access to filesystem or environment variables',
  },
]

export const SuggestedQueries = ({
  className,
}: {
  className?: string
}) => {
  const [expanded, setExpanded] = useState<boolean | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('suggestedQueriesExpanded')
    setExpanded(stored === 'true')
  }, [])

  const query = useGraphStore(state => state.query)
  const updateQuery = useGraphStore(state => state.updateQuery)

  const toggleExpanded = () => {
    setExpanded(prev => {
      const newValue = !prev
      localStorage.setItem(
        'suggestedQueriesExpanded',
        String(newValue),
      )
      return newValue
    })
  }

  const runQuery = (suggestedQuery: string) =>
    updateQuery(`${query} ${suggestedQuery}`)

  if (expanded === null) return null

  return (
    <div
      className={cn(
        'my-4 flex cursor-default flex-col gap-2 overflow-hidden rounded-xl border-[1px] border-dashed border-muted bg-white p-3 dark:bg-muted-foreground/5',
        className,
      )}>
      <div className="flex w-full items-center justify-between">
        <p className="text-sm font-medium tracking-tight">
          Suggested Queries
        </p>
        <Button
          size="icon"
          className="size-6 rounded-sm"
          variant="secondary"
          onClick={toggleExpanded}>
          <motion.span animate={{ rotate: expanded ? 90 : 0 }}>
            <ChevronRight className="text-muted-foreground" />
          </motion.span>
        </Button>
      </div>

      <AnimatePresence mode="sync" initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, filter: 'blur(1px)', opacity: 0 }}
            animate={{
              height: 'auto',
              filter: 'blur(0px)',
              opacity: 1,
            }}
            exit={{ height: 0, filter: 'blur(1px)', opacity: 0 }}
            className="flex flex-col divide-y-[1px] divide-muted">
            {queries.map(query => {
              const tokens = Query.getQueryTokens(query.query)
              return (
                <div
                  key={query.name}
                  data-testid={query.name}
                  className="flex flex-col gap-1 py-3">
                  <p className="text-sm font-medium text-foreground">
                    {query.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {query.description}
                  </p>
                  <div
                    role="button"
                    onClick={() => runQuery(query.query)}
                    className="duration-250 group mt-1 flex cursor-default items-center gap-2 rounded-lg border-[1px] border-muted bg-background px-2 py-1.5 transition-colors hover:border-muted-foreground/50">
                    <Search
                      size={16}
                      className="duration-250 text-muted-foreground transition-colors group-hover:text-foreground"
                    />
                    <div className="flex">
                      {tokens.map((segment, idx) => (
                        <QueryToken variant={segment.type} key={idx}>
                          {segment.token}
                        </QueryToken>
                      ))}
                    </div>
                    <CornerDownRight
                      size={16}
                      className="duration-250 ml-auto text-muted-foreground/40 transition-colors group-hover:text-foreground"
                    />
                  </div>
                </div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
