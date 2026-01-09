import {
  Fragment,
  forwardRef,
  useEffect,
  useState,
  useMemo,
  useCallback,
} from 'react'
import { useQueryState, parseAsString, parseAsInteger } from 'nuqs'
import { AnimatePresence, motion } from 'framer-motion'
import {
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  CircleAlert,
  Sparkle,
  Shield,
  Wrench,
  Calendar,
  TrendingUp,
  PackageSearch,
} from 'lucide-react'
import { SearchResult } from '@/components/search/search-results/search-result.tsx'
import { JellyTriangleSpinner } from '@/components/ui/jelly-spinner.tsx'
import {
  Empty,
  EmptyMedia,
  EmptyTitle,
  EmptyHeader,
  EmptyDescription,
} from '@/components/ui/empty-state.tsx'
import { Cross } from '@/components/ui/cross.tsx'
import { Button } from '@/components/ui/button.tsx'
import {
  Table,
  TableBody,
  TableCaption,
  TableFooter,
  TableRow,
  TablePaginationList,
  TablePaginationListItem,
  TablePaginationListButton,
  TableFilterList,
  TableFilterListItem,
  TableFilterListButton,
} from '@/components/table/index.tsx'
import { FAVORITE_PACKAGES } from '@/lib/constants/favorite-packages.ts'
import { useSearchResultsStore } from '@/state/search-results.ts'
import { useDebounce } from '@/components/hooks/use-debounce.tsx'
import { cn } from '@/lib/utils.ts'

import type {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
} from '@tanstack/react-table'
import type { ComponentProps } from 'react'
import type { MotionProps } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import type { SearchObject } from '@/lib/package-search'

// Extend ColumnDef to include icon property
type CustomColumnDef<TData> = ColumnDef<TData> & {
  icon?: LucideIcon
}

const Decorator = forwardRef<HTMLDivElement, ComponentProps<'div'>>(
  ({ className, ...props }, ref) => (
    <div
      aria-hidden
      className={cn('block h-full w-full max-lg:hidden', className)}
      ref={ref}
      {...props}
    />
  ),
)
Decorator.displayName = 'Decorator'

/** Decorator to display on the sides of the table */
const SideDecorator = forwardRef<
  HTMLDivElement,
  ComponentProps<typeof Decorator> & {
    side: { right?: true } | { left?: true }
  }
>(({ className, side }, ref) => {
  return (
    <Decorator className={cn('flex flex-col', className)} ref={ref}>
      <div className="h-[108px]" />
      <div className="relative h-[46px] border-y">
        <Cross top {...side} />
        <Cross bottom {...side} />
      </div>
      <div className="grow" />
      <div className="relative h-[46px] border-y">
        <Cross top {...side} />
        <Cross bottom {...side} />
      </div>
    </Decorator>
  )
})
SideDecorator.displayName = 'SideDecorator'

/** Supercharge table components */
const MotionTableRow = motion.create(TableRow)
const MotionTableCaption = motion.create(TableCaption)

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

const tableCaptionMotion: MotionProps = {
  initial: {
    opacity: 0,
    filter: 'blur(4px)',
    y: 4,
  },
  animate: {
    opacity: 1,
    filter: 'blur(0px)',
    y: 0,
  },
  exit: {
    opacity: 0,
    filter: 'blur(4px)',
    y: -4,
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

const columns: CustomColumnDef<SearchObject>[] = [
  {
    id: 'relevance',
    icon: Sparkle,
    enableSorting: true,
    accessorFn: i => i.searchScore ?? i.score.final,
    sortingFn: (rowA, rowB) => {
      const a = rowA.original.searchScore ?? rowA.original.score.final
      const b = rowB.original.searchScore ?? rowB.original.score.final
      return b - a
    },
  },
  {
    id: 'popularity',
    icon: TrendingUp,
    enableSorting: true,
    accessorFn: i => i.score.detail.popularity,
    sortingFn: (rowA, rowB) => {
      const a = rowA.original.score.detail.popularity
      const b = rowB.original.score.detail.popularity
      return b - a
    },
  },
  {
    id: 'quality',
    icon: Shield,
    enableSorting: true,
    accessorFn: i => i.score.detail.quality,
    sortingFn: (rowA, rowB) => {
      const a = rowA.original.score.detail.quality
      const b = rowB.original.score.detail.quality
      return b - a
    },
  },
  {
    id: 'maintenance',
    icon: Wrench,
    enableSorting: true,
    accessorFn: i => i.score.detail.maintenance,
    sortingFn: (rowA, rowB) => {
      const a = rowA.original.score.detail.maintenance
      const b = rowB.original.score.detail.maintenance
      return b - a
    },
  },
  {
    id: 'published',
    icon: Calendar,
    enableSorting: true,
    accessorFn: i => i.package.date,
    sortingFn: (rowA, rowB) => {
      const a = new Date(rowA.original.package.date).getTime()
      const b = new Date(rowB.original.package.date).getTime()
      return b - a
    },
  },
]

export const SearchResults = () => {
  const [urlQuery, setUrlQuery] = useQueryState(
    'q',
    parseAsString.withDefault(''),
  )
  const [urlPage, setUrlPage] = useQueryState(
    'page',
    parseAsInteger.withDefault(1),
  )
  const [urlPageSize] = useQueryState(
    'pageSize',
    parseAsInteger.withDefault(25),
  )
  const [urlSortBy, setUrlSortBy] = useQueryState(
    'sortBy',
    parseAsString.withDefault(''),
  )
  const [urlSortDir, setUrlSortDir] = useQueryState(
    'sortDir',
    parseAsString.withDefault('asc'),
  )

  const [columnFilters, setColumnFilters] =
    useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] =
    useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState({})
  const reset = useSearchResultsStore(state => state.reset)
  const results = useSearchResultsStore(state => state.results)
  const totalResults = useSearchResultsStore(state => state.total)
  const fetchResults = useSearchResultsStore(
    state => state.fetchResults,
  )
  const setQuery = useSearchResultsStore(state => state.setQuery)

  // Debounce the URL query
  const debouncedQuery = useDebounce(urlQuery, 300)
  const isLoading = useSearchResultsStore(state => state.isLoading)
  const error = useSearchResultsStore(state => state.error)
  const [showLoading, setShowLoading] = useState(false)

  // Only show loading spinner after .5 seconds to prevent flashing
  useEffect(() => {
    if (!isLoading) {
      setShowLoading(false)
      return
    }

    const timer = setTimeout(() => {
      setShowLoading(true)
    }, 500)

    return () => clearTimeout(timer)
  }, [isLoading])

  // Don't show old results if we're loading
  const shouldShowResults = !isLoading && results.length > 0
  const shouldShowNoResults =
    !isLoading && results.length === 0 && debouncedQuery

  // Convert URL state to TanStack Table format
  const sorting = useMemo<SortingState>(() => {
    if (!urlSortBy) return []
    return [{ id: urlSortBy, desc: urlSortDir === 'desc' }]
  }, [urlSortBy, urlSortDir])

  const setSorting = useCallback(
    (
      updater: SortingState | ((old: SortingState) => SortingState),
    ) => {
      const newSorting =
        typeof updater === 'function' ? updater(sorting) : updater
      if (newSorting.length === 0) {
        void setUrlSortBy(null)
        void setUrlSortDir(null)
      } else {
        const firstSort = newSorting[0]
        if (firstSort) {
          void setUrlSortBy(firstSort.id)
          void setUrlSortDir(firstSort.desc ? 'desc' : 'asc')
        }
      }
    },
    [sorting, setUrlSortBy, setUrlSortDir],
  )

  const table = useReactTable({
    data: results,
    columns,
    pageCount: Math.ceil(totalResults / urlPageSize),
    manualPagination: true,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination: {
        pageIndex: urlPage - 1,
        pageSize: urlPageSize,
      },
    },
  })

  // Fetch results when URL params change, reset on unmount
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.trim() === '') {
      reset()
      return
    }

    setQuery(debouncedQuery)
    void fetchResults(urlPage, urlPageSize)

    return reset
  }, [
    debouncedQuery,
    urlPage,
    urlPageSize,
    setQuery,
    fetchResults,
    reset,
  ])

  const handleLucky = () => {
    const idx = Math.floor(Math.random() * FAVORITE_PACKAGES.length)
    const randomPackage = FAVORITE_PACKAGES[idx]
    void setUrlQuery(randomPackage ?? 'vlt')
  }

  // Calculate pagination state
  const pageIndex = table.getState().pagination.pageIndex
  const pageCount = table.getPageCount()
  const pagination = useMemo(() => {
    const currentPage = pageIndex + 1
    const totalPages = pageCount
    const maxVisible = 6

    const pages: number[] = []

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      const halfVisible = Math.floor(maxVisible / 2)
      let start = Math.max(1, currentPage - halfVisible)
      const end = Math.min(totalPages, start + maxVisible - 1)

      if (end - start < maxVisible - 1) {
        start = Math.max(1, end - maxVisible + 1)
      }

      for (let i = start; i <= end; i++) {
        pages.push(i)
      }
    }

    return {
      currentPage,
      totalPages,
      visiblePages: pages,
      showStartEllipsis: (pages[0] ?? 1) > 1,
      showEndEllipsis:
        (pages[pages.length - 1] ?? totalPages) < totalPages,
    }
  }, [pageIndex, pageCount])

  return (
    <section className="bg-background overflow-y-hidden">
      <div className="grid-cols-[1fr_4fr_1fr] border-t lg:grid">
        <SideDecorator side={{ right: true }} />
        <Table variant="list" className="border-x border-t-0">
          <AnimatePresence mode="wait" initial={false}>
            {totalResults !== 0 ?
              <MotionTableCaption
                {...tableCaptionMotion}
                key={`table-caption-${debouncedQuery}`}>
                Showing{' '}
                <span className="mx-1.5 font-mono text-2xl tabular-nums">
                  {table.getPaginationRowModel().rows.length}
                </span>{' '}
                of{' '}
                <span className="mx-1.5 font-mono text-2xl tabular-nums">
                  {totalResults.toLocaleString()}
                </span>{' '}
                results for{' '}
                <span className="fancy-quote mr-0.5 ml-2 font-medium max-lg:hidden">
                  &ldquo;
                </span>
                {debouncedQuery}
                <span className="fancy-quote ml-0.5 font-medium max-lg:hidden">
                  &rdquo;
                </span>
              </MotionTableCaption>
            : <MotionTableCaption
                {...tableCaptionMotion}
                key={`table-caption-empty-${debouncedQuery}`}>
                Start typing to search
              </MotionTableCaption>
            }
          </AnimatePresence>
          {table.getHeaderGroups().map(headerGroup => (
            <TableFilterList key={headerGroup.id}>
              {headerGroup.headers.map(header => {
                const columnDef = header.column
                  .columnDef as CustomColumnDef<SearchObject>
                const Icon = columnDef.icon
                const isSorted = header.column.getIsSorted()
                const canSort = header.column.getCanSort()

                return (
                  <TableFilterListItem key={header.id}>
                    <TableFilterListButton
                      className="capitalize"
                      enableSorting={canSort}
                      disabled={results.length === 0}
                      isActive={isSorted !== false}
                      dir={
                        isSorted === 'asc' ? 'asc'
                        : isSorted === 'desc' ?
                          'desc'
                        : undefined
                      }
                      onClick={() => {
                        if (canSort && header.id) {
                          const currentSort = isSorted
                          if (!currentSort) {
                            void setUrlSortBy(header.id)
                            void setUrlSortDir('asc')
                          } else if (currentSort === 'asc') {
                            void setUrlSortDir('desc')
                          } else {
                            void setUrlSortBy(null)
                            void setUrlSortDir(null)
                          }
                        }
                      }}>
                      {Icon && <Icon />}
                      {header.id}
                    </TableFilterListButton>
                  </TableFilterListItem>
                )
              })}
            </TableFilterList>
          ))}
          <TableBody className="min-h-[calc(100svh-64px-108px-46px-46px)]">
            <AnimatePresence mode="wait">
              {isLoading && showLoading ?
                <MotionSearchResultsSection
                  className="bg-background h-full w-full items-center justify-center rounded"
                  key="loading"
                  {...searchResultsSectionMotion}>
                  <JellyTriangleSpinner />
                </MotionSearchResultsSection>
              : error ?
                <MotionSearchResultsSection
                  key="error"
                  {...searchResultsSectionMotion}
                  className="bg-background rounded">
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
                  {...searchResultsSectionMotion}
                  className="bg-background rounded">
                  <Empty className="h-full w-full">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <PackageSearch />
                      </EmptyMedia>
                      <EmptyTitle>No results found</EmptyTitle>
                      <EmptyDescription>
                        We couldn't find any results for{' '}
                        <strong>{debouncedQuery}</strong>
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                </MotionSearchResultsSection>
              : shouldShowResults ?
                <motion.div
                  key={`results-${debouncedQuery}-${urlPage}`}
                  variants={searchResultsContainerVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="flex flex-col gap-px rounded">
                  {table.getRowModel().rows.map(row => (
                    <MotionTableRow
                      key={row.id}
                      variants={searchResultItemVariants}>
                      <SearchResult item={row.original} />
                    </MotionTableRow>
                  ))}
                </motion.div>
              : <MotionSearchResultsSection
                  key="results-list-empty-state"
                  {...searchResultsSectionMotion}
                  className="bg-background rounded">
                  <Empty className="h-full w-full">
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
          </TableBody>
          <TableFooter>
            <TablePaginationList
              className={cn(
                'grid h-full grid-cols-12 lg:h-[45px]',
                pagination.visiblePages.length < 6 &&
                  'flex justify-between',
                pagination.showEndEllipsis && 'grid-cols-10',
              )}>
              <TablePaginationListItem className="max-lg:col-span-12">
                <TablePaginationListButton
                  as="previous"
                  disabled={urlPage <= 1}
                  onClick={() => {
                    void setUrlPage(Math.max(1, urlPage - 1))
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }}>
                  Previous
                </TablePaginationListButton>
              </TablePaginationListItem>

              {pagination.visiblePages.map(page => (
                <TablePaginationListItem key={page}>
                  <TablePaginationListButton
                    as="number"
                    active={urlPage === page}
                    onClick={() => {
                      void setUrlPage(page)
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }}>
                    {page.toLocaleString()}
                  </TablePaginationListButton>
                </TablePaginationListItem>
              ))}

              {pagination.showEndEllipsis && (
                <Fragment>
                  <TablePaginationListItem className="col-span-3 lg:col-span-1">
                    <TablePaginationListButton as="ellipsis" />
                  </TablePaginationListItem>
                  <TablePaginationListItem>
                    <TablePaginationListButton
                      as="number"
                      active={urlPage === pagination.totalPages}
                      onClick={() => {
                        void setUrlPage(pagination.totalPages)
                        window.scrollTo({
                          top: 0,
                          behavior: 'smooth',
                        })
                      }}>
                      {pagination.totalPages.toLocaleString()}
                    </TablePaginationListButton>
                  </TablePaginationListItem>
                </Fragment>
              )}

              <TablePaginationListItem className="max-lg:col-span-12">
                <TablePaginationListButton
                  as="next"
                  disabled={urlPage >= pagination.totalPages}
                  onClick={() => {
                    void setUrlPage(
                      Math.min(pagination.totalPages, urlPage + 1),
                    )
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }}>
                  Next
                </TablePaginationListButton>
              </TablePaginationListItem>
            </TablePaginationList>
          </TableFooter>
        </Table>
        <SideDecorator side={{ left: true }} />
      </div>
    </section>
  )
}

const SearchResultsSection = forwardRef<
  HTMLDivElement,
  ComponentProps<'div'>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        'relative flex h-full w-full flex-col',
        'min-h-[calc(100svh-64px-109.5px-50px-49px)] lg:min-h-[calc(100svh-64px-109.5px-50px-49px)]',
        className,
      )}
      {...props}
    />
  )
})
SearchResultsSection.displayName = 'SearchResultsSection'

const MotionSearchResultsSection = motion.create(SearchResultsSection)
