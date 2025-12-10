import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils.ts'
import { forwardRef } from 'react'

import type { VariantProps } from 'class-variance-authority'

type Color =
  | 'pink'
  | 'blue'
  | 'green'
  | 'yellow'
  | 'red'
  | 'purple'
  | 'amber'
  | 'white'

interface InlineCodeProps
  extends
    React.ComponentProps<'span'>,
    VariantProps<typeof variants> {
  children?: React.ReactNode
  color?: Color
}

const variants = cva(
  'inline-flex rounded-lg px-2 items-center py-0.5 text-inherit font-normal',
  {
    variants: {
      color: {
        pink: 'text-pink-500',
        blue: 'text-blue-500',
        green: 'text-green-500',
        yellow: 'text-yellow-500',
        amber: 'text-amber-500',
        red: 'text-red-500',
        purple: 'text-purple-500',
        white: 'text-foreground',
      },
      variant: {
        unstyled: '',
        mono: 'font-courier text-muted-foreground dark:bg-neutral-700/50 bg-neutral-700/5 border-none',
        monoGhost:
          'font-courier text-muted-foreground bg-transparent',
        default:
          'border-[1px] font-mono border-muted bg-white dark:bg-black',
      },
    },
    defaultVariants: {
      color: 'pink',
      variant: 'default',
    },
  },
)

export const InlineCode = forwardRef<
  HTMLSpanElement,
  InlineCodeProps
>(({ children, className, variant, color, ...rest }, ref) => (
  <span
    ref={ref}
    className={cn(variants({ color, variant, className }))}
    {...rest}>
    {children}
  </span>
))

InlineCode.displayName = 'InlineCode'
