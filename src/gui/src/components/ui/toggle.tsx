import { useState } from 'react'
import { motion } from 'framer-motion'
import { type LucideProps, type LucideIcon } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip.jsx'

export interface Option {
  icon: (props: LucideProps) => React.ReactElement<LucideIcon>
  toolTipContent: string
  key: string
  callBack: (o?: any) => void
}

interface ToggleProps {
  options: [Option, Option]
}

const Toggle = ({ options }: ToggleProps) => {
  const [activeOption, setActiveOption] = useState<string>(
    options[0].key,
  )

  const optionClickHandler = (key: string) => {
    const newOption =
      activeOption === key ?
        key === options[0].key ?
          options[1].key
        : options[0].key
      : key

    const selectedOption = options.find(
      option => option.key === newOption,
    )
    if (!selectedOption) return

    setActiveOption(newOption)
    selectedOption.callBack()
  }

  return (
    <div className="flex mx-3">
      <div className="relative flex items-center p-1 h-[2.5rem] bg-white dark:bg-black w-full rounded-sm border border-[1px] border-muted-foreground/25">
        {/* the toggle slider */}
        <motion.div
          className="absolute h-[2rem] w-[2rem] rounded-sm bg-muted border border-muted-foreground/20"
          animate={{
            left: activeOption === options[0].key ? 4 : 36,
          }}
        />

        {options.map((option, idx) => (
          <TooltipProvider key={idx}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  onClick={() => optionClickHandler(option.key)}
                  className="cursor-pointer h-[2rem] w-[2rem] rounded-sm flex items-center justify-center z-[1]">
                  <option.icon
                    size={20}
                    className="text-muted-foreground"
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>{option.toolTipContent}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
    </div>
  )
}

export { Toggle }
