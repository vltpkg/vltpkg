import { type Column, type ColumnDef } from '@tanstack/react-table'
import { type DashboardDataProject } from '@/state/types.js'
import { ArrowUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button.jsx'
import { format } from 'date-fns'
import {
  Tooltip,
  TooltipProvider,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip.jsx'
import { Badge } from '../ui/badge.jsx'

const SortingHeader = ({
  column,
  header,
  className = '',
}: {
  column: Column<DashboardDataProject, unknown>
  header: string
  className?: string
}) => {
  return (
    <Button
      className={`px-0 py-0 hover:bg-transparent ${className}`}
      variant="ghost"
      onClick={() =>
        column.toggleSorting(column.getIsSorted() === 'asc')
      }>
      {header}
      <ArrowUpDown className="ml-2 h-4 w-4" />
    </Button>
  )
}

const dashboardColumns: ColumnDef<DashboardDataProject>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <SortingHeader header="Name" column={column} />
    ),
    cell: ({ row }) => {
      const name = row.original.name

      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger className="text-left truncate font-medium w-[300px]">
              {name}
            </TooltipTrigger>
            <TooltipContent align="start">{name}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    },
    size: 300,
    maxSize: 300,
    minSize: 300,
    enableHiding: false,
  },
  {
    accessorKey: 'directory',
    header: 'Directory',
    cell: ({ row }) => {
      const path = row.original.readablePath

      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger className="text-left truncate w-[500px]">
              {path}
            </TooltipTrigger>
            <TooltipContent align="start">{path}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    },
    size: 500,
    maxSize: 500,
    minSize: 500,
    enableHiding: true,
  },
  {
    accessorKey: 'tools',
    header: 'Tools',
    cell: ({ row }) => {
      const tools = row.original.tools

      return (
        <div className="flex gap-1">
          {tools.map((tool, idx) => (
            <Badge
              className="text-xs font-normal"
              variant="outline"
              key={idx}>
              {tool}
            </Badge>
          ))}
        </div>
      )
    },
    size: 300,
    maxSize: 300,
    minSize: 300,
    enableHiding: true,
  },
  {
    accessorKey: 'version',
    header: 'Version',
    cell: ({ row }) => {
      const x = row.original.manifest.version
      return <p>{x}</p>
    },
    size: 100,
    maxSize: 100,
    minSize: 100,
    enableHiding: true,
  },
  {
    accessorKey: 'type',
    header: 'type',
    cell: ({ row }) => {
      const type =
        row.original.manifest.type ?
          row.original.manifest.type
        : 'N/A'

      return <p>{type}</p>
    },
    size: 200,
    maxSize: 200,
    minSize: 300,
    enableHiding: true,
  },
  {
    accessorKey: 'private',
    header: 'Private / Public',
    cell: ({ row }) => {
      const isPrivate = row.original.manifest.private
      return <p>{isPrivate ? 'Private' : 'Public'}</p>
    },
    size: 200,
    maxSize: 200,
    minSize: 200,
    enableHiding: true,
  },
  {
    accessorKey: 'time',
    header: () => (
      <p className="flex w-full items-center text-right justify-end">
        Time
      </p>
    ),
    cell: ({ row }) => {
      const mtime = row.original.mtime
      const formattedTime = mtime ? new Date(mtime) : null
      const fullMTime =
        formattedTime ?
          format(formattedTime, 'yyyy-MM-dd HH:mm:ss')
        : 'N/A'
      const humanMTime =
        formattedTime ? format(formattedTime, 'MMMM do, yyyy') : 'N/A'

      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger className="text-right w-full">
              {humanMTime}
            </TooltipTrigger>
            <TooltipContent align="end">{fullMTime}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    },
    size: 200,
    maxSize: 200,
    minSize: 200,
    enableHiding: true,
  },
]

export { dashboardColumns }
