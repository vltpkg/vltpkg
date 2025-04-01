import { useState } from 'react'
import type { Table, VisibilityState } from '@tanstack/react-table'
import type { SocketSecurityDetails } from '@/lib/constants/socket.js'
import { SOCKET_SECURITY_DETAILS } from '@/lib/constants/socket.js'
import { DataTable } from '@/components/data-table/data-table.jsx'
import { TableViewDropdown } from '@/components/data-table/table-view-dropdown.jsx'
import { selectorColumns } from '@/components/help-selectors/selector-table-columns.jsx'
import { Input } from '@/components/ui/input.jsx'
import Markdown from 'react-markdown'
import { markdownComponents } from '@/components/markdown-components.jsx'
import { selectorsContent } from '@/components/help-selectors/content.js'
import { cn } from '@/lib/utils.js'

export const HelpSelectors = () => {
  return (
    <section className="flex h-full w-full flex-col rounded-b-lg border-x-[1px] border-b-[1px]">
      <div className="flex h-full max-h-[calc(100svh-65px-2px-16px)] w-full max-w-8xl flex-col">
        <Markdown
          className="prose-sm prose-neutral mt-8 w-full max-w-none px-8 md:w-2/3"
          components={markdownComponents}>
          {selectorsContent}
        </Markdown>
        <SelectorsTable className="mt-8" />
      </div>
    </section>
  )
}

const SelectorsTable = ({ className }: { className?: string }) => {
  const [table, setTable] =
    useState<Table<SocketSecurityDetails> | null>(null)
  const [columnVisibility, setColumnVisibility] =
    useState<VisibilityState>({})
  const [search, setSearch] = useState<string>('')

  const selectorData = Object.values(SOCKET_SECURITY_DETAILS)

  return (
    <div
      className={cn(
        'flex h-full w-full flex-col gap-8 overflow-y-scroll px-8',
        className,
      )}>
      <div className="flex gap-2">
        <Input
          placeholder="Filter Selectors"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <TableViewDropdown
          columnVisibility={columnVisibility}
          setColumnVisibility={setColumnVisibility}
          table={table}
        />
      </div>
      <DataTable
        data={selectorData}
        setTable={setTable}
        filterValue={search}
        columns={selectorColumns}
        columnVisibility={columnVisibility}
        setColumnVisibility={setColumnVisibility}
      />
    </div>
  )
}
