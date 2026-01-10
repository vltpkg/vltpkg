import { Fragment, forwardRef, useState, useMemo } from 'react'
import { NavLink } from 'react-router'
import {
  PackageSearch,
  Home,
  List,
  Layers,
  SendToBack,
  GalleryVerticalEnd,
  Blocks,
} from 'lucide-react'
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { sortMethod } from '@vltpkg/semver'
import { Query } from '@/components/icons/index.ts'
import { Button } from '@/components/ui/button.tsx'
import { DEFAULT_QUERY, useGraphStore } from '@/state/index.ts'
import { ResultItem } from '@/components/explorer-grid/results/result-item.tsx'
import {
  Empty,
  EmptyMedia,
  EmptyTitle,
  EmptyHeader,
  EmptyContent,
  EmptyDescription,
} from '@/components/ui/empty-state.tsx'
import {
  Table,
  TableBody,
  TableRow,
  TablePaginationList,
  TablePaginationListButton,
  TablePaginationListItem,
  TableFilterList,
  TableFilterListItem,
  TableFilterListButton,
  TableCaption,
  TableFooter,
} from '@/components/table/index.tsx'
import { Cross } from '@/components/ui/cross.tsx'
import { cn } from '@/lib/utils.ts'

import type { ComponentProps } from 'react'
import type { LucideIcon } from 'lucide-react'
import type {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
} from '@tanstack/react-table'
import type { GridItemData } from '@/components/explorer-grid/types.ts'

// Extend ColumnDef to include icon property
type CustomColumnDef<TData> = ColumnDef<TData> & {
  icon?: LucideIcon
}

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

const SideDecorator = forwardRef<
  HTMLDivElement,
  ComponentProps<typeof Decorator> & {
    side: { left?: true } | { right?: true }
  }
>(({ className, side, ...rest }, ref) => {
  return (
    <Decorator
      ref={ref}
      className={cn('flex flex-col', className)}
      {...rest}>
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

const columns: CustomColumnDef<GridItemData>[] = [
  {
    id: 'alphabetical',
    icon: List,
    enableSorting: true,
    accessorFn: i => i.title,
    sortingFn: (rowA, rowB) => {
      const a = rowA.original.title.toLowerCase()
      const b = rowB.original.title.toLowerCase()
      return a.localeCompare(b, 'en')
    },
  },
  {
    id: 'version',
    icon: Layers,
    enableSorting: true,
    accessorFn: i => i.version,
    sortingFn: (rowA, rowB) => {
      const a = rowA.original.version
      const b = rowB.original.version
      return sortMethod(a, b)
    },
  },
  {
    id: 'dependency type',
    icon: SendToBack,
    enableSorting: true,
    accessorFn: i => i.type || 'prod',
    sortingFn: (rowA, rowB) => {
      // Sort order: prod < dev < optional < peer < peerOptional
      const typeOrder: Record<string, number> = {
        prod: 0,
        dev: 1,
        optional: 2,
        peer: 3,
        peerOptional: 4,
      }
      const a = typeOrder[rowA.original.type || 'prod'] ?? 99
      const b = typeOrder[rowB.original.type || 'prod'] ?? 99
      return a - b
    },
  },
  {
    id: 'dependents',
    icon: GalleryVerticalEnd,
    enableSorting: true,
    accessorFn: i => i.size,
    sortingFn: (rowA, rowB) => {
      const a = rowA.original.size
      const b = rowB.original.size
      return a - b
    },
  },
  {
    id: 'module type',
    icon: Blocks,
    enableSorting: true,
    accessorFn: i =>
      i.to?.manifest?.type ? i.to.manifest.type : null,
    sortingFn: (rowA, rowB) => {
      const a = rowA.original.to?.manifest?.type || ''
      const b = rowB.original.to?.manifest?.type || ''
      return a.localeCompare(b, 'en')
    },
  },
]

export const Results = ({
  allItems,
}: {
  allItems: GridItemData[]
}) => {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] =
    useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] =
    useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState({})
  const updateQuery = useGraphStore(state => state.updateQuery)
  const query = useGraphStore(state => state.query)

  const noResults = allItems.length === 0
  const handleRootClick = () => updateQuery(DEFAULT_QUERY)

  const table = useReactTable({
    data: allItems,
    columns,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  })

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
          {noResults ?
            <TableCaption>No results</TableCaption>
          : <TableCaption>
              Showing{' '}
              <span className="mx-1.5 font-mono text-2xl tabular-nums">
                {table.getPaginationRowModel().rows.length}
              </span>{' '}
              of{' '}
              <span className="mx-1.5 font-mono text-2xl tabular-nums">
                {allItems.length.toLocaleString()}
              </span>{' '}
              results
            </TableCaption>
          }
          {table.getHeaderGroups().map(headerGroup => (
            <TableFilterList key={headerGroup.id}>
              {headerGroup.headers.map(header => {
                const columnDef = header.column
                  .columnDef as CustomColumnDef<GridItemData>
                const Icon = columnDef.icon
                const isSorted = header.column.getIsSorted()
                const canSort = header.column.getCanSort()

                return (
                  <TableFilterListItem key={header.id}>
                    <TableFilterListButton
                      className="capitalize"
                      isActive={isSorted !== false}
                      dir={
                        isSorted === 'asc' ? 'asc'
                        : isSorted === 'desc' ?
                          'desc'
                        : undefined
                      }
                      enableSorting={canSort}
                      disabled={noResults}
                      onClick={header.column.getToggleSortingHandler()}>
                      {Icon && <Icon />}
                      {header.id}
                    </TableFilterListButton>
                  </TableFilterListItem>
                )
              })}
            </TableFilterList>
          ))}
          <TableBody className="min-h-[calc(100svh-64px-108px-46px-46px)]">
            {table.getRowModel().rows.length > 0 ?
              table.getRowModel().rows.map(row => (
                <TableRow key={row.id}>
                  <ResultItem item={row.original} />
                </TableRow>
              ))
            : <Empty className="bg-background h-full w-full rounded">
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
                      size="sm"
                      onClick={handleRootClick}
                      disabled={query === DEFAULT_QUERY}>
                      <Home />
                      <span>Project Root</span>
                    </Button>
                    <Button variant="outline" asChild size="sm">
                      <NavLink to="/help/selectors">
                        <Query />
                        <span>Available Selectors</span>
                      </NavLink>
                    </Button>
                  </div>
                </EmptyContent>
              </Empty>
            }
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
                  disabled={!table.getCanPreviousPage()}
                  onClick={() => {
                    table.previousPage()
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }}>
                  Previous
                </TablePaginationListButton>
              </TablePaginationListItem>

              {pagination.visiblePages.map(page => (
                <TablePaginationListItem key={page}>
                  <TablePaginationListButton
                    as="number"
                    active={pagination.currentPage === page}
                    onClick={() => {
                      table.setPageIndex(page - 1)
                      window.scrollTo({
                        top: 0,
                        behavior: 'smooth',
                      })
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
                      active={
                        pagination.currentPage ===
                        pagination.totalPages
                      }
                      onClick={() => {
                        table.setPageIndex(pagination.totalPages - 1)
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
                  disabled={!table.getCanNextPage()}
                  onClick={() => {
                    table.nextPage()
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
