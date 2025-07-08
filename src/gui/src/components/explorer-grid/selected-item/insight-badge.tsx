import { cva } from 'class-variance-authority'
import type { VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils.ts'
import React, { forwardRef } from 'react'
import type { PackageAlert } from '@vltpkg/security-archive'
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
  TooltipPortal,
} from '@/components/ui/tooltip.tsx'

type InsightColor = Record<
  PackageAlert['severity'],
  {
    background: string
    border: string
    text: string
  }
>

export const alertStyles: InsightColor = {
  low: {
    background:
      'bg-gray-500/5 dark:bg-gray-600/10 hover:bg-gray-500/15',
    border:
      'border-[1px] border-gray-600/80 hover:border-gray-500/80',
    text: 'text-gray-600 dark:text-gray-400',
  },
  medium: {
    background:
      'bg-yellow-500/5 dark:bg-yellow-600/10 hover:bg-yellow-500/15',
    border:
      'border-[1px] border-yellow-600/80 hover:border-yellow-500/80',
    text: 'text-yellow-700 dark:text-yellow-600',
  },
  high: {
    background: 'bg-red-500/5 dark:bg-red-600/10 hover:bg-red-500/15',
    border: 'border-[1px] border-red-600/80 hover:border-red-500/80',
    text: 'text-red-600 dark:text-red-500',
  },
  critical: {
    background: 'bg-red-500/5 dark:bg-red-600/10 hover:bg-red-500/15',
    border: 'border-[1px] border-red-600/80 hover:border-red-500/80',
    text: 'text-red-600 dark:text-red-500',
  },
} as const

export const getAlertStyle = (
  severity: PackageAlert['severity'],
): InsightColor[PackageAlert['severity']] => alertStyles[severity]

interface InsightBadgeProps
  extends React.ComponentProps<'span'>,
    VariantProps<typeof variants> {
  children?: string
  color?: PackageAlert['severity']
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
      Object.entries(alertStyles).map(([key, value]) => [
        key,
        `${value.text} ${value.background} ${value.border}`,
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
            <TooltipTrigger className="inline-flex cursor-default items-center justify-center">
              {badge}
            </TooltipTrigger>
            <TooltipPortal>
              <TooltipContent>{tooltipContent}</TooltipContent>
            </TooltipPortal>
          </Tooltip>
        </TooltipProvider>
      : badge
  },
)

InsightBadge.displayName = 'InlineCode'
