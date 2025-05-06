import type { PaginationState } from '@tanstack/react-table'

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx'

interface TablePageSelectProps {
  pagination: PaginationState
  setPagination: React.Dispatch<React.SetStateAction<PaginationState>>
}

export const TablePageSelect = ({
  pagination,
  setPagination,
}: TablePageSelectProps) => {
  const options: { value: number }[] = [
    {
      value: 10,
    },
    {
      value: 25,
    },
    {
      value: 50,
    },
  ]

  const setSelectedValue = (selectedValue: number) => {
    setPagination(prev => ({
      ...prev,
      pageSize: selectedValue,
    }))
  }

  return (
    <Select onValueChange={v => setSelectedValue(Number(v))}>
      <SelectTrigger className="w-[110px]">
        <SelectValue
          className="placeholder:text-sm placeholder:font-normal placeholder:text-muted-foreground"
          placeholder={`Show ${pagination.pageSize}`}
        />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {options.map((option, idx) => (
            <SelectItem
              className="text-sm"
              key={idx}
              value={option.value.toString()}>
              Show {option.value}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
