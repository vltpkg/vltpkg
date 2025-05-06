import { cn } from '@/lib/utils.ts'
import type { MotionProps, AnimationProps } from 'framer-motion'
import { motion } from 'framer-motion'
import React from 'react'

const animationProps = {
  initial: { '--x': '100%' },
  animate: { '--x': '-100%' },
  transition: {
    repeat: Infinity,
    repeatType: 'loop',
    repeatDelay: 10,
    type: 'spring',
    stiffness: 20,
    damping: 15,
    mass: 2,
  },
} as AnimationProps

interface ShinyButtonProps
  extends Omit<React.HTMLAttributes<HTMLElement>, keyof MotionProps>,
    MotionProps {
  children: React.ReactNode
  className?: string
}

export const ShinyButton = React.forwardRef<
  HTMLButtonElement,
  ShinyButtonProps
>(({ children, className, ...props }, ref) => {
  return (
    <motion.button
      ref={ref}
      className={cn(
        'relative rounded-lg bg-transparent px-6 py-2 font-medium backdrop-blur-xl duration-300 ease-in-out dark:bg-[radial-gradient(circle_at_50%_0%,hsl(var(--foreground)/10%)_0%,transparent_60%)]',
        className,
      )}
      {...animationProps}
      {...props}>
      <span
        className="relative block size-full text-sm font-medium tracking-wide text-[rgb(0,0,0,65%)] dark:text-[rgb(255,255,255,90%)]"
        style={{
          maskImage:
            'linear-gradient(-75deg,hsl(var(--foreground)) calc(var(--x) + 20%),transparent calc(var(--x) + 30%),hsl(var(--foreground)) calc(var(--x) + 100%))',
        }}>
        {children}
      </span>
      <span
        style={{
          mask: 'linear-gradient(rgb(0,0,0), rgb(0,0,0)) content-box,linear-gradient(rgb(0,0,0), rgb(0,0,0))',
          maskComposite: 'exclude',
        }}
        className="absolute inset-0 z-10 block rounded-[inherit] bg-[linear-gradient(-75deg,hsl(var(--foreground)/10%)_calc(var(--x)+20%),hsl(var(--foreground)/50%)_calc(var(--x)+25%),hsl(var(--foreground)/10%)_calc(var(--x)+100%))] p-px"></span>
    </motion.button>
  )
})

ShinyButton.displayName = 'ShinyButton'
