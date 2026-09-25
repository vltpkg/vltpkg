'use client'

import { motion, AnimatePresence } from 'motion/react'
import { useTextSelection } from '@/hooks/use-text-selection'
import { useCopy } from '@/hooks/use-copy'
import { Button } from '@/components/ui/button'
import { SlidingNumber } from '@/components/ui/sliding-number'
import { getWordCount } from '@/utils/get-word-count'
import { cn } from 'cn'

import type { MotionProps, HTMLMotionProps } from 'motion/react'

const MotionButton = motion.create(Button)

const containerMotion: MotionProps = {
  initial: { opacity: 0, filter: 'blur(4px)', scale: 0.95, y: 4 },
  animate: { opacity: 1, filter: 'blur(0px)', scale: 1, y: 0 },
  exit: { opacity: 0, filter: 'blur(4px)', scale: 0.95, y: 4 },
  transition: { duration: 0.25, ease: 'easeOut' },
}

const TextSelection = ({
  ref,
  className,
  ...props
}: HTMLMotionProps<'div'>) => {
  const { selection } = useTextSelection()
  const wordCount = getWordCount(selection ?? '')
  const { copy } = useCopy()

  const handleCopy = async (v: string): Promise<void> => copy(v)

  return (
    <AnimatePresence initial={false} mode="wait">
      {selection && (
        <motion.div
          ref={ref}
          key="text-selection"
          {...containerMotion}
          className={cn(
            // inset-x-0 pins it to the viewport (a bare `fixed` keeps its static left); only the button takes clicks
            'pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-row items-center justify-center',
            className,
          )}
          {...props}>
          <MotionButton
            // pressing a button would otherwise clear the selection before the click lands
            onMouseDown={e => e.preventDefault()}
            onClick={() => void handleCopy(selection)}
            whileTap={{ scale: 1.025 }}
            size="sm"
            variant="outline"
            // solid fill: outline's dark:bg-input/30 is see-through over article text
            className="font-pixel-grid bg-background dark:bg-background dark:hover:bg-muted pointer-events-auto relative z-2000 text-xs capitalize shadow-sm">
            <SlidingNumber value={wordCount} padStart={true} />{' '}
            <span>words selected</span>
          </MotionButton>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
TextSelection.displayName = 'TextSelection'

export { TextSelection }
