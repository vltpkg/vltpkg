import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  type VisibilityState,
  type SortingState,
  type Table as ITable,
  type PaginationState,
  getFilteredRowModel,
  getSortedRowModel,
} from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table.jsx'
import { Button } from '@/components/ui/button.jsx'
import { useEffect, useState } from 'react'
import { TablePageSelect } from '@/components/data-table/table-page-select.jsx'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  filterValue: string
  setTable: (table: ITable<TData>) => void
  setColumnVisibility: React.Dispatch<
    React.SetStateAction<VisibilityState>
  >
  columnVisibility: VisibilityState
  onClickHandler?: (o: any) => void
}

export const DataTable = <TData, TValue>({
  columns,
  data,
  setTable,
  filterValue,
  setColumnVisibility,
  columnVisibility,
  onClickHandler,
}: DataTableProps<TData, TValue>) => {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState<string>('')
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    columnResizeMode: 'onChange',
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    state: {
      sorting,
      globalFilter,
      columnVisibility,
      pagination,
    },
  })

  useEffect(() => {
    setGlobalFilter(filterValue)
  }, [filterValue])

  useEffect(() => {
    setTable(table)
  }, [table])

  return (
    <>
      <div className="rounded-md border bg-white dark:bg-black">
        <Table className="">
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => {
                  return (
                    <TableHead
                      key={header.id}
                      style={{ width: `${header.getSize()}px` }}>
                      {header.isPlaceholder ? null : (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ?
              table.getRowModel().rows.map(row => (
                <TableRow
                  onClick={() => {
                    return onClickHandler ?
                        onClickHandler(row.original)
                      : null
                  }}
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className={onClickHandler ? 'cursor-pointer' : ''}>
                  {row.getVisibleCells().map(cell => (
                    <TableCell
                      key={cell.id}
                      style={{ width: `${cell.column.getSize()}px` }}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            : <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            }
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell
                colSpan={table.getVisibleFlatColumns().length - 1}>
                <TablePageSelect
                  pagination={pagination}
                  setPagination={setPagination}
                />
              </TableCell>
              <TableCell className="flex items-center justify-end">
                <p className="mr-3 text-nowrap text-xs font-medium text-muted-foreground">
                  {table.getState().pagination.pageIndex + 1} of{' '}
                  {table.getPageCount()}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}>
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}>
                    Next
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </>
  )
}
