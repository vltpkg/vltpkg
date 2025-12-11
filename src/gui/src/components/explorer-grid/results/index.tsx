import { Fragment } from 'react'
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
import { Decorator } from '@/components/ui/decorator.tsx'
import {
  Empty,
  EmptyMedia,
  EmptyTitle,
  EmptyHeader,
  EmptyContent,
  EmptyDescription,
} from '@/components/ui/empty-state.tsx'

import type { GridItemData } from '@/components/explorer-grid/types.ts'

export const Results = ({
  allItems,
}: {
  allItems: GridItemData[]
}) => {
  return (
    <ResultsProvider allItems={allItems}>
      <div className="bg-background h-full">
        <div className="bg-background-secondary h-full">
          <ResultsHeader />

          <div className="grid-cols-[1fr_4fr_1fr] lg:grid">
            <Decorator className="pl-0 max-lg:hidden" />
            <div className="flex overflow-x-scroll rounded p-[0.5px] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <ResultsSort className="w-full min-w-0" />
            </div>
            <Decorator className="pr-0 max-lg:hidden" />
          </div>

          <div className="pattern-hatch flex h-9 w-full md:hidden" />

          <ResultsList />

          <div className="grid-cols-[1fr_4fr_1fr] lg:grid">
            <Decorator className="pl-0 max-lg:hidden" />
            <ResultsPaginationNavigation className="p-[0.5px]" />
            <Decorator className="pr-[0px] max-lg:hidden" />
          </div>
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
      <Decorator className="pt-[0px] pl-[0px] max-lg:hidden" />
      <div className="flex h-full w-full p-[0.5px] pt-[0px]">
        <div className="bg-background flex h-full w-full flex-col rounded px-6 pt-12 pb-6">
          <h3 className="inline-block bg-gradient-to-tr from-neutral-500 to-neutral-900 bg-clip-text align-baseline text-3xl font-medium tracking-tight text-transparent dark:from-neutral-400 dark:to-neutral-100">
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
      </div>
      <Decorator className="pt-[0px] pr-[0px] max-lg:hidden" />
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
      <Decorator className="pl-[0px] max-lg:hidden" />
      {noResults ?
        <div className="flex h-full min-h-[calc(100svh-117px-108px-245px-49px-36px)] w-full flex-col items-center justify-center gap-[1px] rounded p-[0.5px] md:min-h-[calc(100svh-65px-108px-49px-48px-2px)]">
          <Empty className="bg-background h-full w-full rounded">
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
      : <div className="flex h-full min-h-[calc(100svh-117px-108px-245px-49px-36px)] w-full flex-col gap-[1px] rounded p-[0.5px] md:min-h-[calc(100svh-65px-108px-49px-48px-2px)]">
          {pageItems.map((item, idx) => (
            <div
              className="bg-background h-fit w-full rounded"
              key={`explorer-result-${idx}`}>
              <ResultItem item={item} />
            </div>
          ))}
        </div>
      }
      <Decorator className="pr-[0px] max-lg:hidden" />
    </div>
  )
}
