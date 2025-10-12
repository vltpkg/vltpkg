import { SearchResult } from '@/components/search/search-result.tsx'
import { SearchResultsSort } from '@/components/search/search-results/sort.tsx'
import { useSearchResultsStore } from '@/state/search-results.ts'
import { useSyncSearchResultsURL } from '@/components/search/search-results/use-sync-url.tsx'
import { cn } from '@/lib/utils.ts'
import { CircleAlert, Loader2, PackageSearch } from 'lucide-react'

import type { LucideIcon } from 'lucide-react'

export const SearchResults = () => {
  // Sync URL params with zustand store
  useSyncSearchResultsURL()
  return (
    <section className="relative mx-auto grid h-full w-full grid-cols-12 gap-8 px-4 py-4">
      <div className="col-span-full w-full py-4 md:sticky md:-top-4 md:z-[1001] md:col-start-3 md:bg-sidebar">
        <SearchResultsHeader />
      </div>
      <div className="col-span-full md:col-span-7 md:col-start-3">
        <SearchResultsList />
      </div>
    </section>
  )
}

const SearchResultsHeader = () => {
  const total = useSearchResultsStore(state => state.total)
  const query = useSearchResultsStore(state => state.query)
  const isLoading = useSearchResultsStore(state => state.isLoading)

  return (
    <div className="flex flex-col gap-3">
      <h3 className="inline-flex items-baseline gap-2 text-3xl tracking-tight">
        Search results for &ldquo;{query}&rdquo;
        {!isLoading && (
          <span className="font-mono text-sm tabular-nums tracking-normal text-muted-foreground">
            ({total.toLocaleString()})
          </span>
        )}
      </h3>
      <div className="flex items-center gap-2">
        <SearchResultsSort />
      </div>
    </div>
  )
}

const SearchResultsState = ({
  title,
  state = 'default',
  className,
  icon: Icon,
}: {
  title?: string
  state?: 'default' | 'error' | 'loading'
  className?: string
  icon: LucideIcon
}) => {
  return (
    <div
      className={cn(
        'flex grow flex-col items-center justify-center gap-3 px-8 py-12',
        className,
      )}>
      <div className="relative flex size-24 items-center justify-center [&_svg]:size-8">
        <Icon
          className={cn(
            'z-[2] text-neutral-500',
            state === 'error' && 'text-red-500',
            state === 'loading' && 'animate-spin',
          )}
        />
        <div
          className={cn(
            'absolute size-24 rounded-full bg-neutral-100 dark:bg-neutral-900',
            state === 'error' && 'bg-red-500/50',
          )}
        />
      </div>
      {title && (
        <p
          className={cn(
            'text-base text-muted-foreground',
            state === 'error' && 'text-red-500',
          )}>
          {title}
        </p>
      )}
    </div>
  )
}

const SearchResultsList = ({ className }: { className?: string }) => {
  const results = useSearchResultsStore(state => state.results)
  const isLoading = useSearchResultsStore(state => state.isLoading)
  const error = useSearchResultsStore(state => state.error)

  if (isLoading) {
    return <SearchResultsState icon={Loader2} state="loading" />
  }

  if (error) {
    return (
      <SearchResultsState
        title={error}
        state="error"
        icon={CircleAlert}
      />
    )
  }

  if (results.length === 0) {
    return (
      <SearchResultsState
        title="No results found"
        icon={PackageSearch}
      />
    )
  }

  return (
    <div className={cn('flex flex-col gap-5', className)}>
      {results.map((result, idx) => (
        <SearchResult
          key={`${result.package.name}-${idx}`}
          item={result}
        />
      ))}
    </div>
  )
}
