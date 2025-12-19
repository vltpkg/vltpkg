import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeftToLine, ArrowRightToLine } from 'lucide-react'
import { Button } from '@/components/ui/button.tsx'
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipPortal,
  TooltipContent,
} from '@/components/ui/tooltip.tsx'
import { useSelectedItemStore } from '@/components/explorer-grid/selected-item/context.tsx'
import { useFocusState } from '@/components/explorer-grid/selected-item/use-focus-state.tsx'
import { cn } from '@/lib/utils.ts'

import type { ComponentProps } from 'react'
import type { MotionProps } from 'framer-motion'

type FocusButtonProps = ComponentProps<typeof Button> & {
  disabled?: boolean
}

const MotionArrowLeftToLine = motion.create(ArrowLeftToLine)
const MotionArrowRightToLine = motion.create(ArrowRightToLine)

const iconMotion: MotionProps = {
  initial: { opacity: 0, filter: 'blur(2px)', scale: 0.98 },
  animate: { opacity: 1, filter: 'blur(0px)', scale: 1 },
  exit: { opacity: 0, filter: 'blur(2px)', scale: 0.98 },
}

export const FocusButton = ({
  className,
  ...rest
}: FocusButtonProps) => {
  const { focused, setFocused } = useFocusState()
  const item = useSelectedItemStore(state => state.selectedItem)

  const toggleFocus = () => setFocused(!focused)

  const noParents = item.to

  return (
    <TooltipProvider>
      <Tooltip delayDuration={100}>
        <TooltipTrigger asChild>
          <Button
            disabled={!noParents}
            onClick={toggleFocus}
            className={cn(
              'text-muted-foreground hover:text-foreground aspect-square! size-7! items-center justify-center rounded-sm p-0! max-lg:hidden [&_svg]:size-4!',
              className,
            )}
            variant="outline"
            {...rest}>
            <AnimatePresence initial={false} mode="wait">
              {!focused ?
                <MotionArrowLeftToLine
                  key="focused"
                  {...iconMotion}
                />
              : <MotionArrowRightToLine
                  key="unfocused"
                  {...iconMotion}
                />
              }
            </AnimatePresence>
          </Button>
        </TooltipTrigger>
        <TooltipPortal>
          <TooltipContent>
            {focused ? 'Expand parent' : 'Collapse parent'}
          </TooltipContent>
        </TooltipPortal>
      </Tooltip>
    </TooltipProvider>
  )
}
