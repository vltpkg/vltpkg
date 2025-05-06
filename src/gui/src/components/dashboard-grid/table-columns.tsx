import type { Column, ColumnDef } from '@tanstack/react-table'
import type { DashboardDataProject } from '@/state/types.ts'
import { ArrowUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button.tsx'
import { format } from 'date-fns'
import {
  Tooltip,
  TooltipProvider,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip.tsx'
import { Badge } from '../ui/badge.tsx'

const SortingHeader = ({
  column,
  header,
  className = '',
}: {
  column: Column<DashboardDataProject>
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

export const dashboardColumns: ColumnDef<DashboardDataProject>[] = [
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
            <TooltipTrigger className="w-[300px] truncate text-left font-medium">
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
    header: ({ column }) => (
      <SortingHeader header="Directory" column={column} />
    ),
    cell: ({ row }) => {
      const path = row.original.readablePath

      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger className="w-[300px] truncate text-left">
              {path}
            </TooltipTrigger>
            <TooltipContent align="start">{path}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    },
    size: 300,
    maxSize: 300,
    minSize: 300,
    enableSorting: true,
    sortingFn: (a, b) => {
      return a.original.path.localeCompare(b.original.path)
    },
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
    header: ({ column }) => (
      <SortingHeader header="Version" column={column} />
    ),
    cell: ({ row }) => {
      const x = row.original.manifest.version
      return <p>{x}</p>
    },
    size: 100,
    maxSize: 100,
    minSize: 100,
    enableSorting: true,
    sortingFn: (a, b) => {
      const aVersion = a.original.manifest.version ?? '0.0.0'
      const bVersion = b.original.manifest.version ?? '0.0.0'
      return aVersion.localeCompare(bVersion)
    },
    enableHiding: true,
  },
  {
    accessorKey: 'type',
    header: 'Type',
    cell: ({ row }) => {
      const type =
        row.original.manifest.type ? row.original.manifest.type : null

      return <p>{type}</p>
    },
    size: 200,
    maxSize: 200,
    minSize: 300,
    enableHiding: true,
  },
  {
    accessorKey: 'modified',
    header: ({ column }) => (
      <SortingHeader
        className="flex w-full justify-end text-right"
        header="Modified"
        column={column}
      />
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
            <TooltipTrigger className="w-full text-right">
              {humanMTime}
            </TooltipTrigger>
            <TooltipContent align="end" className="text-nowrap">
              {fullMTime}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    },
    size: 200,
    maxSize: 200,
    minSize: 200,
    sortingFn: (a, b) => {
      const aTime = a.original.mtime ?? 0
      const bTime = b.original.mtime ?? 0
      return aTime - bTime
    },
    enableSorting: true,
    enableHiding: true,
  },
]
