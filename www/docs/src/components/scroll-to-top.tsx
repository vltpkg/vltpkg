'use client'

import { useScrolled } from '@/hooks/use-scrolled'
import { motion, AnimatePresence } from 'motion/react'
import { Button } from '@/components/ui/button'
import { cn } from 'cn'

import type { HTMLMotionProps, MotionProps } from 'motion/react'

const MotionButton = motion.create(Button)

const buttonMotion: MotionProps = {
  initial: { opacity: 0, filter: 'blur(4px)', scale: 0.95, y: -4 },
  animate: { opacity: 1, filter: 'blur(0px)', scale: 1, y: 0 },
  exit: { opacity: 0, filter: 'blur(4px)', scale: 0.95, y: -4 },
}

const ScrollToTop = ({
  className,
  ref,
  ...props
}: Omit<HTMLMotionProps<'button'>, 'children'>) => {
  const { scrolled } = useScrolled()

  const scrollToTop = () =>
    window.scrollTo({ top: 0, behavior: 'smooth' })

  return (
    <AnimatePresence initial={false} mode="wait">
      {scrolled && (
        <MotionButton
          ref={ref}
          size="sm"
          variant="outline"
          className={cn(
            // solid fill: outline's dark:bg-input/30 is see-through over article text
            'font-pixel-grid bg-background dark:bg-background dark:hover:bg-muted fixed top-6 right-0 left-0 z-2000 mx-auto w-fit text-xs capitalize shadow-sm',
            className,
          )}
          whileTap={{ scale: 1.025 }}
          onClick={() => scrollToTop()}
          {...buttonMotion}
          {...props}>
          <span>back to top</span>
        </MotionButton>
      )}
    </AnimatePresence>
  )
}

export { ScrollToTop }
