import { cva } from 'class-variance-authority'
import type { VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils.js'
import { forwardRef } from 'react'

type Color = 'pink' | 'blue' | 'green' | 'yellow' | 'red' | 'purple'

interface InlineCodeProps
  extends React.ComponentProps<'span'>,
    VariantProps<typeof variants> {
  children: string
  color?: Color
}

const variants = cva(
  'mx-1 rounded-sm border-[1px] border-border bg-white px-1.5 py-1 font-mono text-xs font-normal dark:bg-black',
  {
    variants: {
      color: {
        pink: 'text-pink-500',
        blue: 'text-blue-500',
        green: 'text-green-500',
        yellow: 'text-yellow-500',
        red: 'text-red-500',
        purple: 'text-purple-500',
      },
    },
    defaultVariants: {
      color: 'pink',
    },
  },
)

export const InlineCode = forwardRef<
  HTMLSpanElement,
  InlineCodeProps
>(({ children, className, color, ...rest }, ref) => {
  return (
    <span
      ref={ref}
      className={cn(variants({ color, className }))}
      {...rest}>
      {children}
    </span>
  )
})

InlineCode.displayName = 'InlineCode'
