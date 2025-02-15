import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu.jsx'
import { Button } from '@/components/ui/button.jsx'
import { ChevronDown } from 'lucide-react'
import {
  sortAlphabeticallyAscending,
  sortAlphabeticallyDescending,
  type SortingOption,
} from '@/components/sort-toggle.jsx'
import { useState } from 'react'

interface SortDropdownProps<T> {
  items: T[]
  setFilteredItems: React.Dispatch<React.SetStateAction<T[]>>
  sortKey: keyof T
}

export const SortDropdown = <T extends object>({
  items,
  setFilteredItems,
  sortKey,
}: SortDropdownProps<T>) => {
  const [checkedOption, setCheckedOption] =
    useState<SortingOption>('ascending')

  const handleSort = (option: SortingOption) => {
    setCheckedOption(option)
    if (option === 'ascending') {
      sortAlphabeticallyAscending(items, sortKey, setFilteredItems)
    } else {
      sortAlphabeticallyDescending(items, sortKey, setFilteredItems)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild className="w-[120px]">
        <Button variant="outline" className="text-sm font-normal">
          Sort by
          <ChevronDown size={16} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuCheckboxItem
          checked={checkedOption === 'ascending'}
          onSelect={e => {
            e.preventDefault()
            handleSort('ascending')
          }}>
          Ascending
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={checkedOption === 'descending'}
          onSelect={e => {
            e.preventDefault()
            handleSort('descending')
          }}>
          Descending
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
