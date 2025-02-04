import { Input } from '@/components/ui/input.jsx'
import { Button } from '@/components/ui/button.jsx'
import { ChevronDown, ChevronUp } from 'lucide-react'
import {
  Tooltip,
  TooltipProvider,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip.jsx'

interface TablePageSelectProps {
  setValue: (n: number) => void
  value: number
}

const TablePageSelect = ({
  value,
  setValue,
}: TablePageSelectProps) => {
  const incrementPage = () => {
    setValue(value + 1)
  }

  const decrementPage = () => {
    if (value > 1) {
      setValue(value - 1)
    }
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center h-[40px] gap-1">
            <Input
              className="size-[40px]"
              value={value}
              onChange={e => {
                const newValue = Number(e.target.value)
                setValue(newValue < 1 ? 1 : newValue)
              }}
            />
            <div className="flex flex-col">
              <Button
                variant="ghost"
                size="icon"
                className="h-[20px] rounded-sm"
                onClick={incrementPage}>
                <ChevronUp />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-[20px] rounded-sm"
                onClick={decrementPage}
                disabled={value <= 1}>
                <ChevronDown />
              </Button>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>Results per page</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export { TablePageSelect }
