import { useState } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { ChevronDown } from 'lucide-react'
import {
  Tooltip,
  TooltipProvider,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip.jsx'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover.jsx'
import { type PaginationState } from '@tanstack/react-table'

interface TablePageSelectProps {
  pagination: PaginationState
  setPagination: React.Dispatch<React.SetStateAction<PaginationState>>
}

const TablePageSelect = ({
  pagination,
  setPagination,
}: TablePageSelectProps) => {
  const [isOpen, setIsOpen] = useState<boolean>(false)

  const options: { value: number }[] = [
    {
      value: 10,
    },
    {
      value: 20,
    },
    {
      value: 30,
    },
  ]

  const setSelectedValue = (selectedValue: number) => {
    setIsOpen(false)
    setPagination(prev => ({
      ...prev,
      pageSize: selectedValue,
    }))
  }

  return (
    <TooltipProvider>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground font-medium">
                  Show {pagination.pageSize}
                </span>
                <ChevronDown
                  className="text-muted-foreground"
                  size={16}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>Results per page</TooltipContent>
          </Tooltip>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[100px] flex p-0">
          <div className="flex flex-col w-full">
            {options.map((option, idx) => (
              <Button
                onClick={() => setSelectedValue(option.value)}
                className="text-xs font-normal text-foreground p-0 py-0 w-full"
                variant="ghost"
                key={idx}>
                {option.value}
                <span>results</span>
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </TooltipProvider>
  )
}

export { TablePageSelect }
