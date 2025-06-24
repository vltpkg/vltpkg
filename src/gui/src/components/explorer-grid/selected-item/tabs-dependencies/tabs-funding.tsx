import React, { useMemo } from 'react'
import { TabsTrigger, TabsContent } from '@/components/ui/tabs.tsx'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table.tsx'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import type { ColumnDef } from '@tanstack/react-table'
import { useSelectedItemStore } from '@/components/explorer-grid/selected-item/context.tsx'
import { HeartHandshake } from 'lucide-react'
import { cn } from '@/lib/utils.ts'
import { useGraphStore } from '@/state/index.ts'
import { EmptyState } from '@/components/explorer-grid/selected-item/tabs-dependencies/empty-state.tsx'
import {
  SortingHeader,
  tableClassNames,
} from '@/components/explorer-grid/selected-item/tabs-dependencies/table-utilities.tsx'
import { DataBadge } from '@/components/ui/data-badge.tsx'

export const FundingTabButton = () => {
  const depFunding = useSelectedItemStore(state => state.depFunding)
  const fundingCount = Object.entries(depFunding ?? {}).reduce(
    (acc, [, { count }]) => acc + count,
    0,
  )
  return (
    <TabsTrigger
      value="funding"
      variant="nestedCard"
      className="flex">
      Funding
      {fundingCount > 0 && (
        <DataBadge
          variant="count"
          classNames={{ wrapperClassName: 'ml-1' }}
          content={String(fundingCount)}
        />
      )}
    </TabsTrigger>
  )
}

export const FundingTabContent = () => {
  const depFunding = useSelectedItemStore(state => state.depFunding)
  const updateQuery = useGraphStore(state => state.updateQuery)

  const queryFunding = (url: string) =>
    updateQuery(`:attr(funding,[url*="${url}"])`)

  const fundingCount = Object.entries(depFunding ?? {}).reduce(
    (acc, [, { count }]) => acc + count,
    0,
  )

  const fundingTableData = useMemo(() => {
    return Object.entries(depFunding ?? {}).map(([url, funding]) => ({
      count: funding.count,
      type: funding.type,
      origin: url,
    }))
  }, [depFunding])

  const columns = useMemo<
    ColumnDef<{
      count: number
      type: string | undefined
      origin: string
    }>[]
  >(
    () => [
      {
        id: 'count',
        accessorKey: 'count',
        header: ({ column }) => (
          <SortingHeader
            header="Count"
            column={column}
            className={tableClassNames.cell}
          />
        ),
        cell: ({ row }) => (
          <p className="font-mono text-sm font-medium tabular-nums">
            {row.original.count}
          </p>
        ),
        enableSorting: true,
        sortingFn: (a, b) => {
          return a.original.count - b.original.count
        },
        minSize: 80,
        size: 80,
        maxSize: 80,
      },
      {
        id: 'type',
        accessorKey: 'type',
        header: ({ column }) => (
          <SortingHeader
            header="Type"
            column={column}
            className={tableClassNames.cell}
          />
        ),
        cell: ({ row }) => {
          const { type } = row.original
          return type ? type : '-'
        },
        enableSorting: true,
        minSize: 150,
        size: 150,
        maxSize: 150,
      },
      {
        id: 'origin',
        accessorKey: 'origin',
        header: ({ column }) => (
          <SortingHeader
            header="Type"
            column={column}
            className={tableClassNames.cell}
          />
        ),
        cell: ({ row }) => (
          <span className="lowercase">{row.original.origin}</span>
        ),
        enableSorting: true,
        minSize: 200,
        size: 200,
        maxSize: 200,
      },
    ],
    [],
  )

  const table = useReactTable<{
    count: number
    type: string | undefined
    origin: string
  }>({
    data: fundingTableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  return (
    <TabsContent value="funding">
      {depFunding && fundingCount > 0 ?
        <div className="flex flex-col gap-3 py-4">
          <div className="flex flex-col gap-3 px-6">
            <div className="duration-250 relative flex w-full cursor-default flex-col gap-2 rounded-sm border-[1px] border-muted bg-secondary/30 px-3 py-3 transition-colors">
              <p className="font-regular text-xs tracking-wide text-muted-foreground">
                Packages looking for funding
              </p>
              <p className="inline-flex items-center gap-1 font-mono text-2xl font-medium tabular-nums text-foreground">
                <span>
                  <HeartHandshake
                    className="text-pink-500"
                    size={24}
                  />
                </span>
                {fundingCount}
              </p>
            </div>

            <div className="my-2 flex w-2/3 flex-col gap-1 text-pretty">
              <p className="text-medium text-sm capitalize text-foreground">
                support the tools you rely on
              </p>
              <p className="text-sm font-medium text-muted-foreground">
                Some of the packages you're using have funding options
                available. Supporting them helps ensure these projects
                remain maintained and sustainable for the community.
              </p>
            </div>
          </div>

          <Table className="cursor-default border-t-[1px] border-muted">
            <TableHeader>
              {table.getHeaderGroups().map(headerGroup => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <TableHead
                      key={header.id}
                      className={cn(
                        tableClassNames.cell,
                        'h-fit px-0 py-1 align-middle first-of-type:pl-8 last-of-type:pr-8 [&>button]:first-of-type:pl-0 [&>p]:last-of-type:pl-3',
                      )}
                      style={{ width: `${header.getSize()}px` }}>
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length ?
                table.getRowModel().rows.map(row => (
                  <TableRow
                    key={row.id}
                    role="button"
                    className="cursor-default"
                    onClick={() => queryFunding(row.original.origin)}
                    data-state={row.getIsSelected() && 'selected'}>
                    {row.getVisibleCells().map(cell => (
                      <TableCell
                        key={cell.id}
                        className={cn(
                          tableClassNames.cell,
                          'first-of-type:pl-8 last-of-type:pr-8',
                        )}
                        style={{
                          width: `${cell.column.getSize()}px`,
                        }}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : <TableRow>
                  <TableCell>
                    <p className="text-sm text-muted-foreground">
                      No warnings found
                    </p>
                  </TableCell>
                </TableRow>
              }
            </TableBody>
          </Table>
        </div>
      : <EmptyState
          icon={HeartHandshake}
          message="No dependencies are looking for funding"
        />
      }
    </TabsContent>
  )
}
