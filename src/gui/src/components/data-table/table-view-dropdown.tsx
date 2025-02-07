import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.jsx'
import {
  type Table,
  type VisibilityState,
} from '@tanstack/react-table'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button.jsx'

interface TableViewDropdownProps<TData> {
  table: Table<TData> | null
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
  if (!table) return null

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
                className="cursor-pointer capitalize"
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
