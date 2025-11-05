import { ArrowUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button.tsx'
import { InlineCode } from '@/components/ui/inline-code.tsx'

import type { Column, ColumnDef } from '@tanstack/react-table'
import type { SelectorInTable } from '@/app/help/help-selectors.tsx'

const SortingHeader = ({
  column,
  header,
  className = '',
}: {
  column: Column<SelectorInTable>
  header: string
  className?: string
}) => {
  return (
    <Button
      className={`text-foreground bg-transparent px-0 py-0 hover:bg-transparent ${className}`}
      onClick={() =>
        column.toggleSorting(column.getIsSorted() === 'asc')
      }>
      {header}
      <ArrowUpDown className="ml-2 h-4 w-4" />
    </Button>
  )
}

export const selectorColumns: ColumnDef<SelectorInTable, string>[] = [
  {
    accessorKey: 'selector',
    header: ({ column }) => (
      <SortingHeader header="Selector" column={column} />
    ),
    cell: ({ row }) => {
      const { selector } = row.original

      return <InlineCode color="pink">{selector}</InlineCode>
    },
    size: 350,
    maxSize: 350,
    minSize: 350,
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
    accessorKey: 'description',
    header: 'Description',
    cell: ({ row }) => {
      const { description } = row.original

      return <p className="text-sm">{description}</p>
    },
    size: 500,
    minSize: 500,
    maxSize: 500,
    enableHiding: true,
  },
]
