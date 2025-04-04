import { cva } from 'class-variance-authority'
import type { VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils.js'
import React, { forwardRef } from 'react'
import type { PackageAlert } from '@vltpkg/security-archive'
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip.jsx'

export const getAlertColor = (
  severity: PackageAlert['severity'],
): InsightColor => {
  switch (severity) {
    case 'low':
      return 'gray'
    case 'medium':
      return 'yellow'
    case 'high':
      return 'orange'
    case 'critical':
      return 'red'
  }
}

export type InsightColor =
  | 'gray' /** Low severity */
  | 'yellow' /** Middle severity */
  | 'orange' /** High severity */
  | 'red' /** Critical severity */

const colors: Record<
  InsightColor,
  {
    foreground: string
    background: string
  }
> = {
  gray: {
    foreground: 'text-foreground',
    background: 'bg-neutral-400/70 dark:bg-neutral-600/70',
  },
  yellow: {
    foreground: 'text-foreground',
    background: 'bg-yellow-600/70',
  },
  orange: {
    foreground: 'text-foreground',
    background: 'bg-orange-500/70',
  },
  red: {
    foreground: 'text-foreground',
    background: 'bg-red-500/70',
  },
}

interface InsightBadgeProps
  extends React.ComponentProps<'span'>,
    VariantProps<typeof variants> {
  children?: string
  color?: InsightColor
  tooltipContent?: string
}

const variants = cva('inline-flex items-center justify-center', {
  variants: {
    variant: {
      default:
        'rounded-full px-3 py-0.5 pt-1 text-xs font-courier font-normal',
      marker: 'size-3 p-0 rounded-full',
    },
    color: Object.fromEntries(
      Object.entries(colors).map(([key, value]) => [
        key,
        `${value.foreground} ${value.background}`,
      ]),
    ),
  },
  defaultVariants: {
    variant: 'default',
  },
})

export const InsightBadge = forwardRef<
  HTMLSpanElement,
  InsightBadgeProps
>(
  (
    { children, tooltipContent, className, variant, color, ...rest },
    ref,
  ) => {
    const badge = (
      <span
        ref={ref}
        className={cn(variants({ color, variant }), className)}
        {...rest}>
        {children}
      </span>
    )

    return tooltipContent ?
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger className="cursor-default">
              {badge}
            </TooltipTrigger>
            <TooltipContent>{tooltipContent}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      : badge
  },
)

InsightBadge.displayName = 'InlineCode'
