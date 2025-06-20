import { ArrowUpDown } from 'lucide-react'
import { cn } from '@/lib/utils.ts'
import type { Column } from '@tanstack/react-table'

export const tableClassNames = {
  cell: 'px-3 py-3 align-top cursor-default capitalize',
}

export const SortingHeader = <T,>({
  column,
  header,
  className,
}: {
  column: Column<T>
  header: string
  className?: string
}) => {
  return (
    <button
      className={cn(
        'duration-250 inline-flex items-center gap-1.5 px-3 py-0 transition-colors hover:text-foreground [&>svg]:size-4',
        className,
      )}
      onClick={() =>
        column.toggleSorting(column.getIsSorted() === 'asc')
      }>
      {header}
      <ArrowUpDown />
    </button>
  )
}
