import { forwardRef, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CircleAlert, PackageSearch } from 'lucide-react'
import { SearchResult } from '@/components/search/search-results/search-result.tsx'
import { Button } from '@/components/ui/button.tsx'
import { SearchResultsSort } from '@/components/search/search-results/sort.tsx'
import { SearchResultsPaginationNavigation } from './page-navigation.tsx'
import { JellyTriangleSpinner } from '@/components/ui/jelly-spinner.tsx'
import {
  Empty,
  EmptyMedia,
  EmptyTitle,
  EmptyHeader,
  EmptyDescription,
} from '@/components/ui/empty-state.tsx'
import { useSearchResultsStore } from '@/state/search-results.ts'
import { useSyncSearchResultsURL } from '@/components/search/search-results/use-sync-url.tsx'
import { useDebounce } from '@/components/hooks/use-debounce.tsx'
import { cn } from '@/lib/utils.ts'
import { FAVORITE_PACKAGES } from '@/lib/constants/favorite-packages.ts'

import type { ComponentProps } from 'react'
import type { MotionProps } from 'framer-motion'

const Decorator = ({ className }: { className?: string }) => {
  return (
    <div aria-hidden="true" className={cn('p-[0.5px]', className)}>
      <div className="bg-background h-full rounded" />
    </div>
  )
}

const titleMotion: MotionProps = {
  initial: {
    opacity: 0,
    filter: 'blur(2px)',
  },
  animate: {
    opacity: 1,
    filter: 'blur(0px)',
  },
  exit: {
    opacity: 0,
    filter: 'blur(2px)',
  },
}

export const SearchResults = () => {
  const query = useSearchResultsStore(state => state.query)
  const isLoading = useSearchResultsStore(state => state.isLoading)
  const searchTerm = useSearchResultsStore(state => state.searchTerm)
  const setSearchTerm = useSearchResultsStore(
    state => state.setSearchTerm,
  )
  const executeSearch = useSearchResultsStore(
    state => state.executeSearch,
  )
  const resultsOnPage = useSearchResultsStore(state => state.results)
  const totalResults = useSearchResultsStore(state => state.total)
  const reset = useSearchResultsStore(state => state.reset)
  const inputRef = useRef<HTMLInputElement>(null)
  const results = useSearchResultsStore(state => state.results)

  // Sync URL params with zustand store
  useSyncSearchResultsURL()

  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  const handleLucky = () => {
    const idx = Math.floor(Math.random() * FAVORITE_PACKAGES.length)
    const randomPackage = FAVORITE_PACKAGES[idx]
    setSearchTerm(randomPackage ?? 'vlt')
  }

  useEffect(() => {
    executeSearch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchTerm])

  // On initial load, when there is no searchTerm, focus the input asap
  // so the user can start searching right away
  useEffect(() => {
    if (!searchTerm || searchTerm.trim() === '') {
      inputRef.current?.focus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Reset store when navigating away from search page
  useEffect(() => {
    return () => {
      // Reset store when component unmounts (navigating away from search page)
      // If user navigates back with URL params, useSyncSearchResultsURL will restore state
      reset()
    }
  }, [reset])

  return (
    <section className="bg-background">
      <div className="bg-foreground/6 relative">
        {/* results count */}
        <div className="grid-cols-[1fr_4fr_1fr] lg:grid">
          <Decorator className="max-lg:hidden" />
          <div className="flex w-full p-[0.5px]">
            <div className="bg-background flex w-full flex-col items-center justify-center rounded px-6 pt-12 pb-6 lg:items-start lg:justify-start">
              <div className="h-[75px] lg:h-[36.5px]">
                <AnimatePresence mode="popLayout">
                  {query && results.length !== 0 ?
                    <motion.h3
                      key={`has-results-${query}`}
                      className="inline-block bg-gradient-to-tr from-neutral-500 to-neutral-900 bg-clip-text align-baseline text-3xl font-medium tracking-tight text-transparent dark:from-neutral-400 dark:to-neutral-100"
                      {...titleMotion}>
                      Showing{' '}
                      <span className="font-mono text-2xl tabular-nums">
                        {resultsOnPage.length.toLocaleString()}
                      </span>{' '}
                      of{' '}
                      <span className="font-mono text-2xl tabular-nums">
                        {totalResults.toLocaleString()}
                      </span>{' '}
                      results for
                      <span className="fancy-quote mr-0.5 ml-2 font-medium">
                        &ldquo;
                      </span>
                      {query}
                      <span className="fancy-quote ml-0.5 font-medium">
                        &rdquo;
                      </span>
                    </motion.h3>
                  : <motion.h3
                      key="has-no-results"
                      className="inline-block bg-gradient-to-tr from-neutral-500 to-neutral-900 bg-clip-text align-baseline text-3xl font-medium tracking-tight text-transparent dark:from-neutral-400 dark:to-neutral-100"
                      {...titleMotion}>
                      Start typing to search
                    </motion.h3>
                  }
                </AnimatePresence>
              </div>
            </div>
          </div>
          <Decorator className="max-lg:hidden" />
        </div>

        {/* sorting filters */}
        <div className="grid-cols-[1fr_4fr_1fr] lg:grid">
          <Decorator className="max-lg:hidden" />
          <SearchResultsSort className="w-full p-[0.5px]" />
          <Decorator className="max-lg:hidden" />
        </div>

        <div className="pattern-hatch bg-background h-9 rounded lg:hidden" />

        {/* list view */}
        <div className="grid-cols-[1fr_4fr_1fr] lg:grid">
          <Decorator className="max-lg:hidden" />
          <AnimatePresence mode="popLayout" initial={false}>
            {query && (results.length > 0 || isLoading) ?
              <MotionSearchResultsList
                key="results-list"
                {...searchResultsSectionMotion}
                className="rounded p-[0.5px]"
              />
            : <MotionSearchResultsSection
                key="results-list-empty-state"
                {...searchResultsSectionMotion}>
                <Empty className="h-full w-full grow">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <PackageSearch />
                    </EmptyMedia>
                    <EmptyTitle>
                      Your results will appear here
                    </EmptyTitle>
                    <EmptyDescription>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={handleLucky}>
                        I'm feeling lucky
                      </Button>
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </MotionSearchResultsSection>
            }
          </AnimatePresence>
          <Decorator className="max-lg:hidden" />
        </div>

        {/* pagination */}
        <div className="grid-cols-[1fr_4fr_1fr] lg:grid">
          <Decorator className="max-lg:hidden" />
          <SearchResultsPaginationNavigation className="w-full p-[0.5px]" />
          <Decorator className="max-lg:hidden" />
        </div>
      </div>
    </section>
  )
}

const searchResultsSectionMotion: MotionProps = {
  initial: {
    opacity: 0,
    filter: 'blur(4px)',
  },
  animate: {
    opacity: 1,
    filter: 'blur(0px)',
  },
  exit: {
    opacity: 0,
    filter: 'blur(4px)',
  },
  transition: {
    duration: 0.3,
    ease: [0.22, 1, 0.36, 1],
  },
}

const searchResultsContainerVariants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      duration: 0.2,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.2,
    },
  },
}

const searchResultItemVariants = {
  hidden: {
    opacity: 0,
    filter: 'blur(4px)',
  },
  visible: {
    opacity: 1,
    filter: 'blur(0px)',
    transition: {
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
}

type SearchResultsListProps = ComponentProps<'div'>

const SearchResultsList = forwardRef<
  HTMLDivElement,
  SearchResultsListProps
>(({ className, ...props }, ref) => {
  const results = useSearchResultsStore(state => state.results)
  const isLoading = useSearchResultsStore(state => state.isLoading)
  const error = useSearchResultsStore(state => state.error)
  const query = useSearchResultsStore(state => state.query)
  const page = useSearchResultsStore(state => state.page)
  const sortDir = useSearchResultsStore(state => state.sortDir)
  const sortBy = useSearchResultsStore(state => state.sortBy)
  const [showLoading, setShowLoading] = useState(false)

  // Only show loading spinner after 2 seconds
  useEffect(() => {
    if (!isLoading) {
      setShowLoading(false)
      return
    }

    const timer = setTimeout(() => {
      setShowLoading(true)
    }, 2000)

    return () => clearTimeout(timer)
  }, [isLoading])

  // Don't show old results if we're loading
  const shouldShowResults = !isLoading && results.length > 0
  const shouldShowNoResults =
    !isLoading && results.length === 0 && query

  return (
    <div className="min-w-0" ref={ref} {...props}>
      <AnimatePresence mode="wait">
        {isLoading && showLoading ?
          <MotionSearchResultsSection
            key="loading"
            {...searchResultsSectionMotion}>
            <JellyTriangleSpinner />
          </MotionSearchResultsSection>
        : error ?
          <MotionSearchResultsSection
            key="error"
            {...searchResultsSectionMotion}>
            <Empty className="h-full w-full">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <CircleAlert className="text-red-500" />
                </EmptyMedia>
                <EmptyTitle>An error occurred</EmptyTitle>
                <EmptyDescription>{error}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          </MotionSearchResultsSection>
        : shouldShowNoResults ?
          <MotionSearchResultsSection
            key="no-results"
            {...searchResultsSectionMotion}>
            <Empty className="h-full w-full">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <PackageSearch />
                </EmptyMedia>
                <EmptyTitle>No results found</EmptyTitle>
                <EmptyDescription>
                  We couldn't find any results for{' '}
                  <strong>{query}</strong>
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </MotionSearchResultsSection>
        : shouldShowResults ?
          <motion.div
            key={`results-${query}-${page}-${sortDir}-${sortBy}`}
            className={cn(
              'flex min-h-[calc(100svh-56px-148px-245px-36px-49px)] w-full flex-col gap-[1px] lg:min-h-[calc(100svh-48px-109.5px-49px-49px)]',
              className,
            )}
            variants={searchResultsContainerVariants}
            initial="hidden"
            animate="visible"
            exit="exit">
            {results.map((result, idx) => {
              const uniqueKey = `result-${result.package.name || 'unknown'}-${result.package.version || 'unknown'}-${idx}`
              return (
                <motion.div
                  key={uniqueKey}
                  variants={searchResultItemVariants}
                  className="bg-background rounded">
                  <SearchResult item={result} />
                </motion.div>
              )
            })}
          </motion.div>
        : <MotionSearchResultsSection
            empty
            key="no-results-results-loading"
          />
        }
      </AnimatePresence>
    </div>
  )
})
SearchResultsList.displayName = 'SearchResultsList'

const MotionSearchResultsList = motion.create(SearchResultsList)

const SearchResultsSection = forwardRef<
  HTMLDivElement,
  ComponentProps<'div'> & {
    empty?: boolean
  }
>(({ className, empty, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        'flex h-full w-full flex-col p-[0.5px]',
        'min-h-[calc(100svh-56px-148px-245px-36px-49px)] lg:min-h-[calc(100svh-48px-109.5px-49px-49px)]',
        className,
      )}
      {...props}>
      {!empty && (
        <div className="bg-background flex h-full w-full flex-1 flex-col rounded">
          {children}
        </div>
      )}
    </div>
  )
})
SearchResultsSection.displayName = 'SearchResultsSection'

const MotionSearchResultsSection = motion.create(SearchResultsSection)
