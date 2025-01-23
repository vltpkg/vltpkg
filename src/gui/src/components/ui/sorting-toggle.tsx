import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowDownAz,
  ArrowDownZa,
  type LucideProps,
} from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip.jsx'

interface SortingToggleProps<T> {
  filteredItems: T[]
  setFilteredItems: (i: T[]) => void
  sortKey: keyof T
}

interface SortToggleButton {
  icon: (props: LucideProps) => React.ReactNode
  option: SortOption
  toolTipContent: string
}

type SortOption = 'ascending' | 'descending'

const SortingToggle = <T extends {}>({
  sortKey,
  filteredItems,
  setFilteredItems,
}: SortingToggleProps<T>) => {
  const [sortToggle, setSortToggle] =
    useState<SortOption>('ascending')

  const sortToggleButtons: SortToggleButton[] = [
    {
      icon: props => <ArrowDownAz {...props} />,
      option: 'ascending',
      toolTipContent: 'Sort ascending',
    },
    {
      icon: props => <ArrowDownZa {...props} />,
      option: 'descending',
      toolTipContent: 'Sort descending',
    },
  ]

  const handleSortToggleClick = (option: SortOption) => {
    const newSortToggle =
      sortToggle === option ?
        option === 'ascending' ?
          'descending'
        : 'ascending'
      : option

    setSortToggle(newSortToggle)

    if (newSortToggle === 'ascending') {
      sortAlphabeticallyAscending()
    } else {
      sortAlphabeticallyDescending()
    }
  }

  const sortAlphabeticallyAscending = () => {
    const sorted = [...filteredItems].sort((a, b) =>
      String(a[sortKey]).localeCompare(String(b[sortKey])),
    )
    setFilteredItems(sorted)
  }

  const sortAlphabeticallyDescending = () => {
    const sorted = [...filteredItems].sort((a, b) =>
      String(b[sortKey]).localeCompare(String(a[sortKey])),
    )
    setFilteredItems(sorted)
  }

  return (
    <div className="flex mx-3">
      <div className="relative flex items-center p-1 h-[2.5rem] bg-white dark:bg-black w-full rounded-sm border border-[1px] border-muted-foreground/25">
        {/* the toggle slider */}
        <motion.div
          className="absolute h-[2rem] w-[2rem] rounded-sm bg-muted border border-muted-foreground/20"
          animate={{
            left: sortToggle === 'ascending' ? 4 : 36,
          }}
        />

        {sortToggleButtons.map((button, idx) => (
          <TooltipProvider key={idx}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  onClick={() => {
                    handleSortToggleClick(button.option)
                  }}
                  className="cursor-pointer h-[2rem] w-[2rem] rounded-sm flex items-center justify-center z-[1]">
                  <button.icon
                    size={20}
                    className="text-muted-foreground"
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>{button.toolTipContent}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
    </div>
  )
}

export { SortingToggle }
