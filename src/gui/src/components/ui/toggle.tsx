import { useState } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils.ts'
import type { LucideProps, LucideIcon } from 'lucide-react'

export interface Option {
  icon: (props: LucideProps) => React.ReactElement<LucideIcon>
  toolTipContent: string
  key: string
  callBack: (o?: any) => void
}

export interface ToggleClassNames {
  wrapperClassName?: string
  toggleClassName?: string
  optionClassName?: string
  sliderClassName?: string
}

interface ToggleProps {
  options: [Option, Option]
  value?: string
  classNames?: ToggleClassNames
}

export const Toggle = ({
  options,
  value,
  classNames,
}: ToggleProps) => {
  const [activeOption, setActiveOption] = useState<string>(
    value ?? options[0].key,
  )

  const {
    wrapperClassName,
    toggleClassName,
    optionClassName,
    sliderClassName,
  } = classNames ?? {}

  // Use the value prop if provided, otherwise use internal state
  const currentActiveOption = value ?? activeOption

  const optionClickHandler = (key: string) => {
    const newOption =
      currentActiveOption === key ?
        key === options[0].key ?
          options[1].key
        : options[0].key
      : key

    const selectedOption = options.find(
      option => option.key === newOption,
    )
    if (!selectedOption) return

    if (newOption !== currentActiveOption) {
      if (value === undefined) {
        setActiveOption(newOption)
      }
      selectedOption.callBack()
    }
  }

  return (
    <div className={cn('flex w-fit', wrapperClassName)}>
      <div
        className={cn(
          'relative flex h-[2.5rem] w-full items-center rounded-md border border-[1px] border-muted bg-white p-1 dark:bg-muted-foreground/5',
          toggleClassName,
        )}>
        {/* the toggle slider */}
        <motion.div
          className={cn(
            'absolute h-[2rem] w-[2rem] rounded-[4px] bg-muted',
            sliderClassName,
          )}
          animate={{
            left: currentActiveOption === options[0].key ? 4 : 36,
          }}
        />

        {options.map((option, idx) => (
          <div
            key={idx}
            onClick={() => optionClickHandler(option.key)}
            className={cn(
              'z-[1] flex h-[2rem] w-[2rem] cursor-default items-center justify-center rounded-sm',
              optionClassName,
            )}
            title={option.toolTipContent}>
            <option.icon
              size={20}
              className="text-muted-foreground"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
