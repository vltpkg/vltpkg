import { cva } from 'class-variance-authority'
import type { VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils.js'
import { forwardRef } from 'react'
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip.jsx'

type Color = 'pink' | 'blue' | 'green' | 'yellow' | 'red' | 'purple'

interface InlineCodeProps
  extends React.ComponentProps<'span'>,
    VariantProps<typeof variants> {
  children?: React.ReactNode
  color?: Color
  displayTooltip?: boolean
  tooltip?: string
  tooltipDuration?: number
}

const variants = cva(
  'mx-1 rounded-sm px-1.5 py-1 pt-1.5 text-xs font-normal',
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
>(
  (
    {
      children,
      className,
      variant,
      color,
      tooltip,
      tooltipDuration,
      displayTooltip = false,
      ...rest
    },
    ref,
  ) => {
    const content = (
      <span
        ref={ref}
        className={cn(variants({ color, variant, className }))}
        {...rest}>
        {children}
      </span>
    )

    if (displayTooltip) {
      return (
        <TooltipProvider>
          <Tooltip delayDuration={tooltipDuration}>
            <TooltipTrigger asChild>{content}</TooltipTrigger>
            <TooltipContent>
              {tooltip ? tooltip : children}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    }

    return content
  },
)

InlineCode.displayName = 'InlineCode'
