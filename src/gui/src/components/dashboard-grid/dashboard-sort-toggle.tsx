import { type Option, Toggle } from '@/components/ui/toggle.jsx'
import { ArrowDownAz, ArrowDownZa } from 'lucide-react'

export type SortingOption = 'ascending' | 'descending'

interface DashboardSortToggleProps<T> {
  filteredItems: T[]
  setFilteredItems: (i: T[]) => void
  sortKey: keyof T
}

interface SortOption extends Option {
  key: SortingOption
}

const sortAlphabeticallyAscending = <T,>(
  items: T[],
  sortKey: keyof T,
  setItems: (i: T[]) => void,
) => {
  const sorted = [...items].sort((a, b) =>
    String(a[sortKey]).localeCompare(String(b[sortKey])),
  )
  setItems(sorted)
}

const sortAlphabeticallyDescending = <T,>(
  items: T[],
  sortKey: keyof T,
  setItems: (i: T[]) => void,
) => {
  const sorted = [...items].sort((a, b) =>
    String(b[sortKey]).localeCompare(String(a[sortKey])),
  )
  setItems(sorted)
}

const DashboardSortToggle = <T,>({
  filteredItems,
  setFilteredItems,
  sortKey,
}: DashboardSortToggleProps<T>) => {
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

export { DashboardSortToggle }
