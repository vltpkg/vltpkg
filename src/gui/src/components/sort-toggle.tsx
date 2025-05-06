import { Toggle } from '@/components/ui/toggle.tsx'
import type { Option } from '@/components/ui/toggle.tsx'
import { ArrowDownAz, ArrowDownZa } from 'lucide-react'

export type SortingOption = 'ascending' | 'descending'

interface SortToggleProps<T> {
  filteredItems: T[]
  setFilteredItems: (i: T[]) => void
  sortKey: keyof T
}

interface SortOption extends Option {
  key: SortingOption
}

export const sortAlphabeticallyAscending = <T extends object>(
  items: T[],
  sortKey: keyof T,
  setItems: (i: T[]) => void,
) => {
  const sorted = [...items].sort((a, b) =>
    String(a[sortKey]).localeCompare(String(b[sortKey])),
  )
  setItems(sorted)
}

export const sortAlphabeticallyDescending = <T extends object>(
  items: T[],
  sortKey: keyof T,
  setItems: (i: T[]) => void,
) => {
  const sorted = [...items].sort((a, b) =>
    String(b[sortKey]).localeCompare(String(a[sortKey])),
  )
  setItems(sorted)
}

export const SortToggle = <T extends object>({
  filteredItems,
  setFilteredItems,
  sortKey,
}: SortToggleProps<T>) => {
  const options: [SortOption, SortOption] = [
    {
      icon: props => <ArrowDownAz {...props} />,
      toolTipContent: 'Ascending',
      key: 'ascending',
      callBack: () =>
        sortAlphabeticallyAscending<T>(
          filteredItems,
          sortKey,
          setFilteredItems,
        ),
    },
    {
      icon: props => <ArrowDownZa {...props} />,
      toolTipContent: 'Descending',
      key: 'descending',
      callBack: () =>
        sortAlphabeticallyDescending<T>(
          filteredItems,
          sortKey,
          setFilteredItems,
        ),
    },
  ]

  return <Toggle options={options} />
}
