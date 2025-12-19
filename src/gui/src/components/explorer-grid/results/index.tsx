import { Fragment, forwardRef } from 'react'
import { NavLink } from 'react-router'
import { PackageSearch, Home } from 'lucide-react'
import { Query } from '@/components/icons/index.ts'
import { ResultsSort } from '@/components/explorer-grid/results/sort.tsx'
import { Button } from '@/components/ui/button.tsx'
import {
  ResultsProvider,
  useResultsStore,
} from '@/components/explorer-grid/results/context.tsx'
import { DEFAULT_QUERY, useGraphStore } from '@/state/index.ts'
import { ResultItem } from '@/components/explorer-grid/results/result-item.tsx'
import { ResultsPaginationNavigation } from '@/components/explorer-grid/results/page-navigation.tsx'
import {
  Empty,
  EmptyMedia,
  EmptyTitle,
  EmptyHeader,
  EmptyContent,
  EmptyDescription,
} from '@/components/ui/empty-state.tsx'
import { Cross } from '@/components/ui/cross.tsx'
import { cn } from '@/lib/utils.ts'

import type { ComponentProps } from 'react'
import type { GridItemData } from '@/components/explorer-grid/types.ts'

const Decorator = forwardRef<HTMLDivElement, ComponentProps<'div'>>(
  ({ className, ...rest }, ref) => (
    <div
      ref={ref}
      className={cn(
        'border-background-secondary max-lg:hidden',
        className,
      )}
      {...rest}
    />
  ),
)

Decorator.displayName = 'Decorator'

export const Results = ({
  allItems,
}: {
  allItems: GridItemData[]
}) => {
  return (
    <ResultsProvider allItems={allItems}>
      <div className="bg-background h-full">
        <ResultsHeader />

        <div className="grid-cols-[1fr_4fr_1fr] lg:grid">
          <Decorator className="border-y" />
          <div className="border-background-secondary bg-background-secondary relative flex min-w-0 border-x border-y [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Cross top left />
            <Cross top right />
            <Cross bottom left />
            <Cross bottom right />
            <ResultsSort className="w-full min-w-0" />
          </div>
          <Decorator className="border-y" />
        </div>

        <div className="pattern-hatch flex h-9 w-full md:hidden" />

        <ResultsList />

        <div className="grid-cols-[1fr_4fr_1fr] lg:grid">
          <Decorator className="border-t" />
          <div className="border-background-secondary bg-background-secondary relative flex w-full border-x border-t">
            <Cross top left />
            <Cross top right />
            <ResultsPaginationNavigation className="w-full" />
          </div>
          <Decorator className="border-t" />
        </div>
      </div>
    </ResultsProvider>
  )
}

const ResultsHeader = () => {
  const allItems = useResultsStore(state => state.allItems)
  const pageItems = useResultsStore(state => state.pageItems)

  const allItemsCount = allItems.length
  const allPageItemsCount = pageItems.length

  const noResults = allItems.length === 0

  return (
    <div className="grid-cols-[1fr_4fr_1fr] lg:grid">
      <Decorator className="border-t" />
      <div className="border-background-secondary flex h-full w-full flex-col border-x border-t px-6 pt-12 pb-6">
        <h3 className="inline-block bg-linear-to-tr from-neutral-500 to-neutral-900 bg-clip-text align-baseline text-3xl font-medium tracking-tight text-transparent dark:from-neutral-400 dark:to-neutral-100">
          {noResults ?
            'No results'
          : <Fragment>
              Showing{' '}
              <span className="font-mono text-2xl tabular-nums">
                {allPageItemsCount}
              </span>{' '}
              of{' '}
              <span className="font-mono text-2xl tabular-nums">
                {allItemsCount}
              </span>{' '}
              results
            </Fragment>
          }
        </h3>
      </div>
      <Decorator className="border-t" />
    </div>
  )
}

const ResultsList = () => {
  const pageItems = useResultsStore(state => state.pageItems)
  const allItems = useResultsStore(state => state.allItems)
  const updateQuery = useGraphStore(state => state.updateQuery)
  const query = useGraphStore(state => state.query)

  const noResults = allItems.length === 0

  const handleRootClick = () => updateQuery(DEFAULT_QUERY)

  return (
    <div className="grid-cols-[1fr_4fr_1fr] lg:grid">
      {noResults ?
        <div className="border-background-secondary col-start-2 col-end-3 flex h-full min-h-[calc(100svh-60px-109.5px-246px-36px)] w-full flex-col items-center justify-center border-x md:min-h-[calc(100svh-64px-109.5px-50px-49px)]">
          <Empty className="h-full w-full">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <PackageSearch />
              </EmptyMedia>
              <EmptyTitle>No results found</EmptyTitle>
              <EmptyDescription>
                Your query didn't turn up any results.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={handleRootClick}
                  disabled={query === DEFAULT_QUERY}>
                  <Home />
                  <span>Project Root</span>
                </Button>
                <Button variant="outline" asChild>
                  <NavLink to="/help/selectors">
                    <Query />
                    <span>Available Selectors</span>
                  </NavLink>
                </Button>
              </div>
            </EmptyContent>
          </Empty>
        </div>
      : <div className="bg-background-secondary border-background-secondary col-start-2 col-end-3 flex h-full min-h-[calc(100svh-60px-109.5px-246px-36px)] w-full flex-col gap-px border-x md:min-h-[calc(100svh-64px-109.5px-50px-49px)]">
          {pageItems.map((item, idx) => (
            <div
              className="bg-background h-fit w-full rounded"
              key={`explorer-result-${idx}`}>
              <ResultItem item={item} />
            </div>
          ))}
        </div>
      }
    </div>
  )
}
