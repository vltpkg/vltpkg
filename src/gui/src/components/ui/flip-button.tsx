import { forwardRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button.tsx'
import {
  Heart,
  Mailbox,
  MessageSquareQuote,
  ArrowRight,
  Newspaper,
  LayoutDashboard,
} from 'lucide-react'
import { VltClient, Vsr } from '@/components/icons/index.ts'
import { cn } from '@/lib/utils.ts'

import type { ComponentProps } from 'react'
import type { LucideIcon } from 'lucide-react'

export type Icon =
  | 'Mailbox'
  | 'MessageSquareQuote'
  | 'LayoutDashboard'
  | 'VltClient'
  | 'Vsr'
  | 'Heart'
  | 'Newspaper'

const MotionButton = motion(Button)

const renderIcon = (icon: Icon): LucideIcon => {
  switch (icon) {
    case 'LayoutDashboard':
      return LayoutDashboard
    case 'Vsr':
      return Vsr
    case 'Mailbox':
      return Mailbox
    case 'MessageSquareQuote':
      return MessageSquareQuote
    case 'VltClient':
      return VltClient
    case 'Heart':
      return Heart
    case 'Newspaper':
      return Newspaper
  }
}

interface FlipButtonProps extends Omit<
  ComponentProps<typeof MotionButton>,
  'children' | 'variant'
> {
  label?: string
  icon: Icon
  variant?: 'default' | 'outline'
}

export const FlipButton = forwardRef<
  HTMLButtonElement,
  FlipButtonProps
>(({ className, label, icon, variant = 'outline', ...rest }, ref) => {
  const [hovered, setHovered] = useState<boolean>(false)

  const Icon = renderIcon(icon)

  return (
    <MotionButton
      layout
      layoutRoot
      ref={ref}
      size="sm"
      variant={variant}
      className={cn('w-fit gap-2 overflow-hidden px-4', className)}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      {...rest}>
      <AnimatePresence initial={false} mode="popLayout">
        {!hovered && (
          <motion.div
            key={`${hovered}`}
            layout
            initial={{
              opacity: 0,
              filter: 'blur(2px)',
              scale: 0.95,
              x: -8,
            }}
            animate={{
              opacity: 1,
              filter: 'blur(0px)',
              scale: 1,
              x: 0,
            }}
            exit={{
              opacity: 0,
              filter: 'blur(2px)',
              scale: 0.95,
              x: -8,
            }}
            transition={{
              duration: 0.2,
              ease: 'easeOut',
            }}
            className="flex size-5 items-center justify-center [&>svg]:size-4">
            <Icon />
          </motion.div>
        )}
        <motion.span
          key="span"
          layout
          transition={{
            duration: 0.2,
            ease: 'easeOut',
          }}>
          {label}
        </motion.span>
        {hovered && (
          <motion.div
            key={`${hovered}`}
            layout
            initial={{
              opacity: 0,
              filter: 'blur(2px)',
              scale: 0.95,
              x: -8,
            }}
            animate={{
              opacity: 1,
              filter: 'blur(0px)',
              scale: 1,
              x: 0,
            }}
            exit={{
              opacity: 0,
              filter: 'blur(2px)',
              scale: 0.95,
              x: 8,
            }}
            transition={{
              duration: 0.2,
              ease: 'easeOut',
            }}
            className="flex size-5 items-center justify-center [&>svg]:size-4">
            <ArrowRight />
          </motion.div>
        )}
      </AnimatePresence>
    </MotionButton>
  )
})

FlipButton.displayName = 'FlipButton'
