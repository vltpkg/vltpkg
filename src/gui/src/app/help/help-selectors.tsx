import { useState } from 'react'
import type { Table, VisibilityState } from '@tanstack/react-table'
import type {
  SocketSecurityDetails,
  SocketSecurityRecord,
  Selector,
} from '@/lib/constants/index.ts'
import {
  SOCKET_SECURITY_DETAILS,
  ATTRIBUTE_SELECTORS,
  CLASS_SELECTORS,
  COMBINATOR_SELECTORS,
  PSEUDO_CLASS_SELECTORS,
  PSEUDO_ELEMENT_SELECTORS,
  ID_SELECTORS,
} from '@/lib/constants/index.ts'
import { DataTable } from '@/components/data-table/data-table.tsx'
import { TableViewDropdown } from '@/components/data-table/table-view-dropdown.tsx'
import { selectorColumns } from '@/components/help-selectors/selector-table-columns.tsx'
import { Input } from '@/components/ui/input.tsx'
import Markdown from 'react-markdown'
import { markdownComponents } from '@/components/markdown-components.tsx'
import { selectorsContent } from '@/components/help-selectors/content.ts'
import { cn } from '@/lib/utils.ts'

export type SelectorInTable = Omit<Selector, 'category'> & {
  category: Selector['category'] | SocketSecurityDetails['category']
  severity: SocketSecurityDetails['severity'] | null
}

export const HelpSelectors = () => {
  return (
    <section className="flex h-full max-h-[calc(100svh-65px-16px)] w-full flex-col overflow-y-scroll rounded-b-lg border-x-[1px] border-b-[1px]">
      <div className="flex max-w-8xl flex-col pt-8">
        <div className="prose-sm prose-neutral w-full max-w-none px-8 md:w-2/3">
          <Markdown components={markdownComponents}>
            {selectorsContent}
          </Markdown>
        </div>
        <SelectorsTable className="py-8" />
      </div>
    </section>
  )
}

const isSecurityDetails = (
  value: SocketSecurityRecord | SocketSecurityDetails,
): value is SocketSecurityDetails => {
  return (
    'selector' in value &&
    'description' in value &&
    'category' in value &&
    'severity' in value
  )
}

const flattenSelectors = (): SelectorInTable[] => {
  const regularSelectorGroups = [
    ATTRIBUTE_SELECTORS,
    CLASS_SELECTORS,
    COMBINATOR_SELECTORS,
    PSEUDO_CLASS_SELECTORS,
    PSEUDO_ELEMENT_SELECTORS,
    ID_SELECTORS,
  ]

  const flattenNested = (
    record: SocketSecurityRecord,
  ): SelectorInTable[] =>
    Object.values(record).flatMap(value =>
      isSecurityDetails(value) ? [value] : flattenNested(value),
    )

  return [
    ...flattenNested(SOCKET_SECURITY_DETAILS),
    ...regularSelectorGroups.flatMap(group =>
      Object.values(group).map(selector => ({
        ...selector,
        severity: null,
      })),
    ),
  ]
}

const SelectorsTable = ({ className }: { className?: string }) => {
  const [table, setTable] = useState<
    Table<SelectorInTable> | undefined
  >(undefined)
  const [columnVisibility, setColumnVisibility] =
    useState<VisibilityState>({})
  const [search, setSearch] = useState<string>('')

  const tableData: SelectorInTable[] = flattenSelectors()

  return (
    <div className={cn('flex flex-col gap-8 px-8', className)}>
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
        data={tableData}
        setTable={setTable}
        filterValue={search}
        columns={selectorColumns}
        columnVisibility={columnVisibility}
        setColumnVisibility={setColumnVisibility}
      />
    </div>
  )
}
