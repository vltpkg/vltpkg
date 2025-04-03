import type { Column, ColumnDef } from '@tanstack/react-table'
import type { SocketSecurityDetails } from '@/lib/constants/socket.js'
import { ArrowUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button.jsx'
import {
  getAlertColor,
  InsightBadge,
} from '@/components/explorer-grid/selected-item/insight-badge.jsx'

const SortingHeader = ({
  column,
  header,
  className = '',
}: {
  column: Column<SocketSecurityDetails>
  header: string
  className?: string
}) => {
  return (
    <Button
      className={`bg-transparent px-0 py-0 text-foreground hover:bg-transparent ${className}`}
      onClick={() =>
        column.toggleSorting(column.getIsSorted() === 'asc')
      }>
      {header}
      <ArrowUpDown className="ml-2 h-4 w-4" />
    </Button>
  )
}

export const selectorColumns: ColumnDef<SocketSecurityDetails>[] = [
  {
    accessorKey: 'selector',
    header: ({ column }) => (
      <SortingHeader header="Selector" column={column} />
    ),
    cell: ({ row }) => {
      const { selector, severity } = row.original

      return (
        <InsightBadge
          className="self-start"
          tooltipContent={severity}
          color={getAlertColor(severity)}>
          {selector}
        </InsightBadge>
      )
    },
    size: 100,
    maxSize: 100,
    minSize: 100,
    enableHiding: false,
  },
  {
    accessorKey: 'category',
    header: ({ column }) => (
      <SortingHeader header="Category" column={column} />
    ),
    cell: ({ row }) => {
      const { category } = row.original

      return <p className="text-sm">{category}</p>
    },
    size: 100,
    maxSize: 100,
    minSize: 100,
    enableHiding: true,
  },
  {
    accessorKey: 'severity',
    header: ({ column }) => (
      <SortingHeader header="Severity" column={column} />
    ),
    cell: ({ row }) => {
      const { severity } = row.original

      return (
        <p className="inline-flex items-center gap-2 text-sm">
          <InsightBadge
            variant="marker"
            color={getAlertColor(severity)}
          />
          {severity}
        </p>
      )
    },
    size: 50,
    maxSize: 50,
    minSize: 50,
    enableHiding: true,
  },
  {
    accessorKey: 'description',
    header: 'Description',
    cell: ({ row }) => {
      const { description } = row.original

      return <p className="text-sm">{description}</p>
    },
    size: 200,
    minSize: 200,
    maxSize: 200,
    enableHiding: true,
  },
]
