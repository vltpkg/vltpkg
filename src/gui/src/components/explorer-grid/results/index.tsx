import { ResultItem } from '@/components/explorer-grid/results/result-item.tsx'
import { EmptyResultsState } from '@/components/explorer-grid/results/empty-results-state.tsx'
import { ResultsSort } from '@/components/explorer-grid/results/sort.tsx'
import {
  ResultsProvider,
  useResultsStore,
} from '@/components/explorer-grid/results/context.tsx'
import { ResultsPaginationNavigation } from '@/components/explorer-grid/results/page-navigation.tsx'
import { ResultPageOptions } from '@/components/explorer-grid/results/page-options.tsx'
import { cn } from '@/lib/utils.ts'

import type { GridItemData } from '@/components/explorer-grid/types.ts'

export const Results = ({
  allItems,
}: {
  allItems: GridItemData[]
}) => {
  if (!allItems.length) {
    return (
      <div className="px-8 py-4">
        <EmptyResultsState />
      </div>
    )
  }

  return (
    <ResultsProvider allItems={allItems}>
      <section className="flex h-full flex-col">
        <div className="mx-auto mt-2 w-full max-w-8xl grow px-8 py-4">
          <ResultsHeader />
          <ResultsList className="mt-4" />
        </div>
        <ResultsFooter />
      </section>
    </ResultsProvider>
  )
}

const ResultsHeader = () => {
  const allItems = useResultsStore(state => state.allItems)
  return (
    <div className="flex flex-col gap-3">
      <h3 className="inline-flex items-baseline gap-2 text-lg">
        Results
        <span className="font-mono text-sm tabular-nums text-muted-foreground">
          ({allItems.length})
        </span>
      </h3>
      <div className="flex items-center gap-2">
        <ResultsSort />
      </div>
    </div>
  )
}

const ResultsList = ({ className }: { className?: string }) => {
  const pageItems = useResultsStore(state => state.pageItems)
  return (
    <div className={cn('flex flex-col gap-5', className)}>
      {pageItems.map(item => (
        <ResultItem item={item} key={item.id} />
      ))}
    </div>
  )
}

const ResultsFooter = () => {
  const allItems = useResultsStore(state => state.allItems)

  if (allItems.length === 0) return null

  return (
    <div className="mx-auto grid w-full max-w-8xl grid-cols-12 items-center px-8 py-4">
      <ResultPageOptions className="col-span-3" />
      <ResultsPaginationNavigation className="col-span-6 col-start-4" />
    </div>
  )
}
