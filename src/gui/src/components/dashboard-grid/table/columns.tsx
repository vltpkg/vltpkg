import { Column, ColumnDef } from '@tanstack/react-table'
import type { DashboardDataProject } from '@/state/types.js'
import { ArrowUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button.jsx'
import { format } from 'date-fns'

const SortingHeader = ({
  column,
  header,
}: {
  column: Column<DashboardDataProject, unknown>
  header: string
}) => {
  return (
    <Button
      variant="ghost"
      onClick={() =>
        column.toggleSorting(column.getIsSorted() === 'asc')
      }>
      {header}
      <ArrowUpDown className="ml-2 h-4 w-4" />
    </Button>
  )
}

const columns: ColumnDef<DashboardDataProject>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <SortingHeader header="Name" column={column} />
    ),
  },
  {
    accessorKey: 'path',
    header: ({ column }) => (
      <SortingHeader header="Directory" column={column} />
    ),
  },
  {
    accessorKey: 'tools',
    header: 'Tools',
    cell: ({ row }) => {
      const tools = row.original.tools

      return (
        <p className="flex items-center gap-2">
          {tools.map((tool, idx) => (
            <span key={idx}>{tool}</span>
          ))}
        </p>
      )
    },
  },
  {
    accessorKey: 'mtime',
    header: ({ column }) => (
      <SortingHeader header="Time" column={column} />
    ),
    cell: ({ row }) => {
      const mtime = row.original.mtime

      return (
        <p>
          {mtime ?
            format(new Date(mtime), 'yyyy-MM-dd HH:mm:ss')
          : 'N/A'}
        </p>
      )
    },
  },
]

export { columns }
