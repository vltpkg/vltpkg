import { forwardRef } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils.ts'

import type { ComponentProps } from 'react'
import type { MotionProps } from 'framer-motion'

export const contentMotion: MotionProps = {
  initial: {
    opacity: 0,
    filter: 'blur(2px)',
  },
  animate: { opacity: 1, filter: 'blur(0px)', x: 0 },
  exit: {
    opacity: 0,
    filter: 'blur(0px)',
  },
  transition: { duration: 0.25, ease: 'easeInOut' },
}

const Content = forwardRef<HTMLDivElement, ComponentProps<'section'>>(
  ({ className, ...props }, ref) => {
    return (
      <section
        ref={ref}
        className={cn('h-full w-full', className)}
        {...props}
      />
    )
  },
)

Content.displayName = 'Content'

export const MotionContent = motion.create(Content)
