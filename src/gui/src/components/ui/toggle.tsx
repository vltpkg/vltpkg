import { useState } from 'react'
import { motion } from 'framer-motion'
import type { LucideProps, LucideIcon } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip.tsx'

export interface Option {
  icon: (props: LucideProps) => React.ReactElement<LucideIcon>
  toolTipContent: string
  key: string
  callBack: (o?: any) => void
}

interface ToggleProps {
  options: [Option, Option]
}

export const Toggle = ({ options }: ToggleProps) => {
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
    <div className="flex w-fit">
      <div className="relative flex h-[2.5rem] w-full items-center rounded-md border border-[1px] border-muted bg-white p-1 dark:bg-muted-foreground/5">
        {/* the toggle slider */}
        <motion.div
          className="absolute h-[2rem] w-[2rem] rounded-[4px] bg-muted"
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
                  className="z-[1] flex h-[2rem] w-[2rem] cursor-default items-center justify-center rounded-sm">
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
