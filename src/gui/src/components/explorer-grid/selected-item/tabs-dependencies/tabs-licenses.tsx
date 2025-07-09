import { useMemo } from 'react'
import { useSelectedItemStore } from '@/components/explorer-grid/selected-item/context.tsx'
import { useGraphStore } from '@/state/index.ts'
import { TabsTrigger } from '@/components/ui/tabs.tsx'
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
import { AlertTriangle, Scale } from 'lucide-react'
import { cn } from '@/lib/utils.ts'
import { EmptyState } from '@/components/explorer-grid/selected-item/tabs-dependencies/empty-state.tsx'
import {
  SortingHeader,
  tableClassNames,
} from '@/components/explorer-grid/selected-item/tabs-dependencies/table-utilities.tsx'
import { Warning } from '@/components/explorer-grid/selected-item/tabs-dependencies/warning.tsx'
import { alertStyles } from '@/components/explorer-grid/selected-item/insight-badge.tsx'
import { DataBadge } from '@/components/ui/data-badge.tsx'
import {
  MotionTabsContent,
  tabMotion,
} from '@/components/explorer-grid/selected-item/helpers.tsx'

import type { LicenseWarningType } from '@/components/explorer-grid/selected-item/context.tsx'
import type { SocketSecurityDetails } from '@/lib/constants/index.ts'

export const LicensesTabButton = () => {
  const depLicenses = useSelectedItemStore(state => state.depLicenses)
  const uniqueLicenses = Object.keys(
    depLicenses?.allLicenses ?? {},
  ).length
  return (
    <TabsTrigger value="licenses" variant="nestedCard">
      Licenses
      {uniqueLicenses > 0 && (
        <DataBadge
          variant="count"
          classNames={{ wrapperClassName: 'ml-1' }}
          content={String(uniqueLicenses)}
        />
      )}
    </TabsTrigger>
  )
}

export const LicensesTabContent = () => {
  const depLicenses = useSelectedItemStore(state => state.depLicenses)

  const query = useGraphStore(state => state.query)
  const updateQuery = useGraphStore(state => state.updateQuery)
  const uniqueLicenses = Object.keys(
    depLicenses?.allLicenses ?? {},
  ).length

  const licenseWarningCount = useMemo(() => {
    return Object.values(depLicenses?.byWarning ?? {}).reduce(
      (acc, warningData) => acc + warningData.count,
      0,
    )
  }, [depLicenses?.byWarning])

  const licenseTableData = useMemo(() => {
    return Object.entries(depLicenses?.allLicenses ?? {}).map(
      ([license, count]) => {
        const warnings: LicenseWarningType[] = []
        const severities: SocketSecurityDetails['severity'][] = []

        for (const [warningType, warningData] of Object.entries(
          depLicenses?.byWarning ?? {},
        )) {
          if (warningData.licenses.includes(license)) {
            warnings.push(warningType as LicenseWarningType)
            severities.push(warningData.severity)
          }
        }

        const getHighestSeverity = (
          sevs: SocketSecurityDetails['severity'][],
        ): SocketSecurityDetails['severity'] | undefined => {
          if (sevs.length === 0) return undefined
          const severityOrder = {
            critical: 4,
            high: 3,
            medium: 2,
            low: 1,
          }
          return sevs.reduce((highest, current) =>
            severityOrder[current] > severityOrder[highest] ?
              current
            : highest,
          )
        }

        return {
          license,
          count,
          warnings: warnings.length > 0 ? warnings : undefined,
          severity: getHighestSeverity(severities),
        }
      },
    )
  }, [depLicenses?.allLicenses, depLicenses?.byWarning])

  const queryLicense = (license: string) =>
    updateQuery(`${query} [license='${license}']`)

  const queryLicenseWarning = (licenseWarning: string) =>
    updateQuery(`${query} :license(${licenseWarning})`)

  const queryAllLicenseWarnings = () => {
    if (depLicenses?.byWarning && licenseWarningCount > 0) {
      const activeWarnings = Object.entries(depLicenses.byWarning)
        .filter(([_, warningData]) => warningData.count > 0)
        .map(([warning]) => `:license(${warning})`)
        .join(',')

      if (activeWarnings) {
        updateQuery(`${query} * :is(${activeWarnings})`)
      }
    }
  }

  const columns = useMemo<
    ColumnDef<{
      license: string
      count: number
      warnings: LicenseWarningType[] | undefined
      severity: SocketSecurityDetails['severity'] | undefined
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
        id: 'license',
        accessorKey: 'license',
        header: ({ column }) => (
          <SortingHeader
            header="License"
            column={column}
            className={tableClassNames.cell}
          />
        ),
        cell: ({ row }) => row.original.license,
        enableSorting: true,
        minSize: 200,
        size: 200,
        maxSize: 200,
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
        cell: ({ row }) => {
          const { severity } = row.original

          if (!severity) return '-'
          return (
            <div
              className={cn(
                'inline-flex items-center justify-center rounded-full border-[1px] px-3 py-0.5 text-sm',
                alertStyles[severity].background,
                alertStyles[severity].border,
                alertStyles[severity].text,
              )}>
              {severity}
            </div>
          )
        },
        enableSorting: true,
        minSize: 60,
        size: 60,
        maxSize: 60,
      },
      {
        id: 'warnings',
        accessorKey: 'warnings',
        header: ({ column }) => (
          <SortingHeader
            header="Warnings"
            column={column}
            className={tableClassNames.cell}
          />
        ),
        cell: ({ row }) => row.original.warnings?.join(', ') || '-',
        enableSorting: true,
        minSize: 80,
        size: 80,
        maxSize: 80,
      },
    ],
    [],
  )

  const table = useReactTable<{
    license: string
    count: number
    warnings: LicenseWarningType[] | undefined
    severity: SocketSecurityDetails['severity'] | undefined
  }>({
    data: licenseTableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  return (
    <MotionTabsContent {...tabMotion} value="licenses">
      {depLicenses?.allLicenses && uniqueLicenses > 0 ?
        <div className="flex flex-col gap-3 py-4">
          <div className="px-6">
            <div
              role={licenseWarningCount > 0 ? 'button' : undefined}
              onClick={() => queryAllLicenseWarnings()}
              className={cn(
                'duration-250 relative flex w-full cursor-default flex-col gap-2 rounded-sm border-[1px] border-muted bg-secondary/30 px-3 py-3 transition-colors',
                licenseWarningCount > 0 &&
                  'hover:border-muted-foreground/30 hover:bg-secondary/60',
              )}>
              <p className="font-regular text-xs tracking-wide text-muted-foreground">
                {licenseWarningCount > 0 ?
                  'Licenses warnings'
                : 'License groups'}
              </p>
              <p className="font-mono text-2xl font-medium tabular-nums text-foreground">
                {licenseWarningCount > 0 ?
                  licenseWarningCount
                : uniqueLicenses}
              </p>
              {licenseWarningCount > 0 && (
                <>
                  <div className="absolute -right-3 -top-3 flex size-8 items-center justify-center rounded-full border-[1px] border-yellow-500/50 bg-yellow-300/30 backdrop-blur-sm dark:bg-yellow-900/30">
                    <AlertTriangle className="mb-0.5 size-4 text-yellow-500" />
                  </div>
                  <p className="text-xs font-medium text-yellow-500">
                    Potential license issues detected
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 px-6">
            {Object.entries(depLicenses.byWarning)
              .filter(([_, item]) => item.count !== 0)
              .map(([warning, item], idx) => (
                <Warning
                  severity={item.severity}
                  key={idx}
                  onClick={() => queryLicenseWarning(warning)}
                  icon={undefined}
                  count={item.count}
                  warning={warning}
                  hideIcon
                  className="px-2 py-1"
                />
              ))}
          </div>

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
                    onClick={() => queryLicense(row.original.license)}
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
          icon={Scale}
          message="No license data was found."
        />
      }
    </MotionTabsContent>
  )
}
