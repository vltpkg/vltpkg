import { motion } from 'framer-motion'
import { LayoutGrid, Sheet, type LucideProps } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip.jsx'

interface ViewToggleButton {
  icon: (props: LucideProps) => React.ReactNode
  option: ViewOption
  toolTipContent: string
}

interface ViewToggleProps {
  currentView: ViewOption
  setCurrentView: (o: ViewOption) => void
}

export type ViewOption = 'table' | 'grid'

const ViewToggle = ({
  currentView,
  setCurrentView,
}: ViewToggleProps) => {
  const sortToggleButtons: ViewToggleButton[] = [
    {
      icon: props => <LayoutGrid {...props} />,
      option: 'grid',
      toolTipContent: 'Grid view',
    },
    {
      icon: props => <Sheet {...props} />,
      option: 'table',
      toolTipContent: 'Table view',
    },
  ]

  const handleSortToggleClick = (option: ViewOption) => {
    const newViewToggle =
      currentView === option ?
        option === 'table' ?
          'grid'
        : 'table'
      : option

    setCurrentView(newViewToggle)

    if (newViewToggle === 'table') {
      /* a */
    } else {
      /* b */
    }
  }

  return (
    <div className="flex mx-3">
      <div className="relative flex items-center p-1 h-[2.5rem] bg-white dark:bg-black w-full rounded-sm border border-[1px] border-muted-foreground/25">
        {/* the toggle slider */}
        <motion.div
          className="absolute h-[2rem] w-[2rem] rounded-sm bg-muted border border-muted-foreground/20"
          animate={{
            left: currentView === 'grid' ? 4 : 36,
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

export { ViewToggle }
