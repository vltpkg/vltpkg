import { useMemo } from 'react'
import { useGraphStore } from '@/state/index.ts'
import { useSelectedItemStore } from '@/components/explorer-grid/selected-item/context.tsx'
import { TabsTrigger } from '@/components/ui/tabs.tsx'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table.tsx'
import { ShieldX, AlertTriangle } from 'lucide-react'
import { EmptyState } from '@/components/explorer-grid/selected-item/tabs-dependencies/empty-state.tsx'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { cn } from '@/lib/utils.ts'
import {
  SortingHeader,
  tableClassNames,
} from '@/components/explorer-grid/selected-item/tabs-dependencies/table-utilities.tsx'
import { InsightBadge } from '@/components/explorer-grid/selected-item/insight-badge.tsx'
import {
  getScoreColor,
  scoreColors,
} from '@/components/explorer-grid/selected-item/insight-score-helper.ts'
import { Warning } from '@/components/explorer-grid/selected-item/tabs-dependencies/warning.tsx'
import { DataBadge } from '@/components/ui/data-badge.tsx'
import { toHumanString } from '@/utils/human-string.ts'
import {
  MotionTabsContent,
  tabMotion,
} from '@/components/explorer-grid/selected-item/helpers.tsx'

import type { ColumnDef } from '@tanstack/react-table'
import type { DepWarning } from '@/components/explorer-grid/selected-item/context.tsx'

export const InsightsTabButton = () => {
  const depWarnings = useSelectedItemStore(state => state.depWarnings)
  const totalDepWarnings = Object.values(depWarnings ?? {}).reduce(
    (acc, warning) => acc + warning.count,
    0,
  )
  return (
    <TabsTrigger value="insights" variant="nestedCard">
      Insights
      {totalDepWarnings > 0 && (
        <DataBadge
          variant="count"
          classNames={{ wrapperClassName: 'ml-1' }}
          content={String(totalDepWarnings)}
        />
      )}
    </TabsTrigger>
  )
}

export const InsightsTabContent = () => {
  const depWarnings = useSelectedItemStore(state => state.depWarnings)
  const query = useGraphStore(state => state.query)
  const updateQuery = useGraphStore(state => state.updateQuery)
  const scannedDeps = useSelectedItemStore(state => state.scannedDeps)
  const depCount = useSelectedItemStore(state => state.depCount)
  const averageScore = useSelectedItemStore(
    state => state.depsAverageScore,
  )

  const hasUnscannedDeps = useMemo(() => {
    if (depCount === undefined || scannedDeps === undefined)
      return false
    return depCount !== scannedDeps
  }, [depCount, scannedDeps])

  const totalDepWarnings = useMemo(() => {
    return Object.values(depWarnings ?? {}).reduce(
      (acc, warning) => acc + warning.count,
      0,
    )
  }, [depWarnings])

  const warningsByGroup = useMemo(() => {
    return Object.entries(depWarnings ?? {}).reduce(
      (acc, [, { count, severity }]) => {
        if (count === 0) return acc

        if (!acc[severity]) {
          acc[severity] = 0
        }
        acc[severity] += count

        return acc
      },
      {} as Record<DepWarning['severity'], number>,
    )
  }, [depWarnings])

  const queryWarning = (warning: string) =>
    updateQuery(`${query} ${warning}`)

  const queryWarningsByGroup = (selector: string[]) => {
    if (!depWarnings || totalDepWarnings === 0) return
    const activeWarnings = selector.map(sel => sel).join(',')
    if (activeWarnings) {
      updateQuery(`${query} *:is(${activeWarnings})`)
    }
  }

  const queryUnscannedDeps = () => {
    if (!hasUnscannedDeps) return
    updateQuery(`${query} :not(:scanned)`)
  }

  const columns = useMemo<ColumnDef<DepWarning>[]>(
    () => [
      {
        id: 'total',
        accessorKey: 'total',
        header: ({ column }) => (
          <SortingHeader
            header="Total"
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
        id: 'insight',
        accessorKey: 'insight',
        header: ({ column }) => (
          <SortingHeader
            header="Insight"
            column={column}
            className={tableClassNames.cell}
          />
        ),
        cell: ({ row }) => (
          <InsightBadge
            color={row.original.severity}
            className="lowercase">
            {row.original.selector}
          </InsightBadge>
        ),
        enableSorting: true,
        sortingFn: (a, b) => {
          const aParts = a.original.selector.split(':')
          const bParts = b.original.selector.split(':')
          const aValue = aParts[1] ?? ''
          const bValue = bParts[1] ?? ''
          return aValue.localeCompare(bValue)
        },
        minSize: 150,
        size: 150,
        maxSize: 150,
      },
      {
        id: 'severity',
        accessorKey: 'severity',
        header: ({ column }) => (
          <SortingHeader
            header="Severity"
            column={column}
            className={tableClassNames.cell}
          />
        ),
        cell: ({ row }) => row.original.severity,
        enableSorting: true,
        minSize: 100,
        size: 100,
        maxSize: 100,
      },
      {
        id: 'category',
        accessorKey: 'category',
        header: ({ column }) => (
          <SortingHeader
            header="Category"
            column={column}
            className={tableClassNames.cell}
          />
        ),
        cell: ({ row }) => row.original.category,
        enableSorting: true,
        minSize: 100,
        size: 100,
        maxSize: 100,
      },
    ],
    [],
  )

  const table = useReactTable({
    data: depWarnings ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  const chartColor = getScoreColor(averageScore ?? 0)
  const textColor = scoreColors[chartColor]
  const notScannedDeps =
    !depCount || !scannedDeps ? 0 : depCount - scannedDeps

  return (
    <MotionTabsContent {...tabMotion} value="insights">
      {depCount && depCount > 0 ?
        <div className="flex flex-col gap-3 py-4">
          <div
            className={cn(
              'flex gap-3 px-6',
              hasUnscannedDeps && 'gap-6',
            )}>
            <div
              role={hasUnscannedDeps ? 'button' : undefined}
              onClick={() => queryUnscannedDeps()}
              className={cn(
                'duration-250 relative flex w-full cursor-default flex-col gap-2 rounded-sm border-[1px] border-muted bg-secondary/30 px-3 py-3 transition-colors',
                hasUnscannedDeps &&
                  'hover:border-muted-foreground/30 hover:bg-secondary/60',
              )}>
              <p className="font-regular text-xs tracking-wide text-muted-foreground">
                Dependencies scanned
              </p>
              <p className="font-mono text-2xl font-medium tabular-nums text-foreground">
                {scannedDeps}
                <span className="ml-0.5 text-muted-foreground/80">
                  /{depCount}
                </span>
              </p>

              {hasUnscannedDeps && scannedDeps !== undefined && (
                <>
                  <div className="absolute -right-3 -top-3 flex size-8 items-center justify-center rounded-full border-[1px] border-yellow-500/50 bg-yellow-300/30 backdrop-blur-sm dark:bg-yellow-900/30">
                    <AlertTriangle className="mb-0.5 size-4 text-yellow-500" />
                  </div>
                  <p className="text-xs font-medium text-yellow-500">
                    {toHumanString({
                      zero: 'All dependencies scanned',
                      count: notScannedDeps,
                      one: `${notScannedDeps} dependency not scanned`,
                      value: `${notScannedDeps} dependencies not scanned`,
                    })}
                  </p>
                </>
              )}
            </div>

            {averageScore !== undefined && (
              <div className="relative flex w-full cursor-default flex-col gap-2 rounded-sm border-[1px] border-muted bg-secondary/30 px-3 py-3">
                <p className="font-regular text-xs tracking-wide text-muted-foreground">
                  Average package score
                </p>
                <p
                  className="font-mono text-2xl font-medium tabular-nums text-foreground"
                  style={{
                    color: textColor,
                  }}>
                  {averageScore}
                  <span className="ml-0.5 text-muted-foreground/80">
                    /100
                  </span>
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3 px-6">
            {Object.entries(warningsByGroup).map(
              ([severity, count], idx) => (
                <Warning
                  onClick={() =>
                    queryWarningsByGroup(
                      Object.entries(depWarnings ?? {})
                        .filter(([, w]) => w.severity === severity)
                        .map(([, w]) => w.selector),
                    )
                  }
                  key={`warning-${severity}-${idx}`}
                  warning={`${count} ${severity} severity`}
                  className="rounded-sm px-2 py-1"
                  severity={severity as DepWarning['severity']}
                />
              ),
            )}
          </div>
          {depWarnings && totalDepWarnings > 0 ?
            <Table className="border-t-[1px] border-muted">
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
                      onClick={() =>
                        queryWarning(row.original.selector)
                      }
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
          : ''}
        </div>
      : <EmptyState
          icon={ShieldX}
          message="No insights were available."
        />
      }
    </MotionTabsContent>
  )
}
