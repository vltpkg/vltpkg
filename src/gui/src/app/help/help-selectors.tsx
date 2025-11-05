import { useState } from 'react'
import {
  PSEUDO_SECURITY_SELECTORS,
  PSEUDO_STATE_SELECTORS,
  PSEUDO_ATTRIBUTE_SELECTOR,
  PSEUDO_PROJECT_SELECTORS,
  PSEUDO_FUNCTIONAL_CLASSES,
  PSEUDO_RELATIONSHIP_SELECTORS,
  COMBINATOR_SELECTORS,
  ID_SELECTORS,
} from '@/lib/constants/index.ts'
import { DataTable } from '@/components/data-table/data-table.tsx'
import { TableViewDropdown } from '@/components/data-table/table-view-dropdown.tsx'
import { selectorColumns } from '@/components/help-selectors/selector-table-columns.tsx'
import { Input } from '@/components/ui/input.tsx'
import { selectorsContent } from '@/components/help-selectors/content.ts'
import { cn } from '@/lib/utils.ts'
import { Markdown } from '@/components/markdown-components.tsx'

import type { Table, VisibilityState } from '@tanstack/react-table'
import type { Selector } from '@/lib/constants/index.ts'

export type SelectorInTable = Omit<
  Selector,
  'label' | 'securityCategory' | 'severity'
>

export const HelpSelectors = () => {
  return (
    <section className="flex h-full w-full flex-col">
      <div className="max-w-8xl flex flex-col pt-8">
        <div className="prose-sm prose-neutral w-full max-w-none px-8 md:w-2/3">
          <Markdown>{selectorsContent}</Markdown>
        </div>
        <SelectorsTable className="py-8" />
      </div>
    </section>
  )
}

const SelectorsTable = ({ className }: { className?: string }) => {
  const [table, setTable] = useState<
    Table<SelectorInTable> | undefined
  >(undefined)
  const [columnVisibility, setColumnVisibility] =
    useState<VisibilityState>({})
  const [search, setSearch] = useState<string>('')

  const transformSelector = (selector: Selector): SelectorInTable => {
    const result: SelectorInTable = {
      selector: selector.selector,
      category: selector.category,
      description: selector.description,
    }

    if ('arguments' in selector && selector.arguments) {
      result.arguments = selector.arguments
    }

    return result
  }

  const tableData: SelectorInTable[] = [
    // Flatten all selector objects and remove excluded properties
    ...Object.values(PSEUDO_SECURITY_SELECTORS).map(
      transformSelector,
    ),
    ...Object.values(PSEUDO_STATE_SELECTORS).map(transformSelector),
    ...Object.values(PSEUDO_ATTRIBUTE_SELECTOR).map(
      transformSelector,
    ),
    ...Object.values(PSEUDO_PROJECT_SELECTORS).map(transformSelector),
    ...Object.values(PSEUDO_FUNCTIONAL_CLASSES).map(
      transformSelector,
    ),
    ...Object.values(PSEUDO_RELATIONSHIP_SELECTORS).map(
      transformSelector,
    ),
    ...Object.values(COMBINATOR_SELECTORS).map(transformSelector),
    ...Object.values(ID_SELECTORS).map(transformSelector),
  ]

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
      <DataTable<SelectorInTable, string>
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
