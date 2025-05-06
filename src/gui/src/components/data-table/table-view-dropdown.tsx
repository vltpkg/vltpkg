import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.tsx'
import type { Table, VisibilityState } from '@tanstack/react-table'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button.tsx'
import { Skeleton } from '@/components/ui/skeleton.tsx'

interface TableViewDropdownProps<TData> {
  table: Table<TData> | undefined
  className?: string
  columnVisibility: VisibilityState
  setColumnVisibility: React.Dispatch<
    React.SetStateAction<VisibilityState>
  >
}

export const TableViewDropdown = <TData extends object>({
  className = '',
  table,
  columnVisibility,
  setColumnVisibility,
}: TableViewDropdownProps<TData>) => {
  if (!table) return <Skeleton className={`h-full ${className}`} />

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild className={className}>
        <Button variant="outline" className="text-sm font-normal">
          Columns <ChevronDown />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {table
          .getAllColumns()
          .filter(column => column.getCanHide())
          .map(column => {
            return (
              <DropdownMenuCheckboxItem
                key={column.id}
                className="capitalize"
                onSelect={e => e.preventDefault()}
                checked={
                  columnVisibility[column.id] ?? column.getIsVisible()
                }
                onCheckedChange={val => {
                  setColumnVisibility(prev => ({
                    ...prev,
                    [column.id]: val,
                  }))
                }}>
                {column.id}
              </DropdownMenuCheckboxItem>
            )
          })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
