// Tremor ProgressBar [v0.0.3]

import React from 'react'
import { tv } from 'tailwind-variants'
import type { VariantProps } from 'tailwind-variants'

import { cn } from '@/lib/utils.js'

const progressBarVariants = tv({
  slots: {
    background: '',
    bar: '',
  },
  variants: {
    variant: {
      default: {
        background: 'bg-blue-200 dark:bg-blue-500/30',
        bar: 'bg-blue-500 dark:bg-blue-500',
      },
      neutral: {
        background: 'bg-gray-200 dark:bg-gray-500/40',
        bar: 'bg-gray-500 dark:bg-gray-500',
      },
      warning: {
        background: 'bg-yellow-200 dark:bg-yellow-500/30',
        bar: 'bg-yellow-500 dark:bg-yellow-500',
      },
      error: {
        background: 'bg-red-200 dark:bg-red-500/30',
        bar: 'bg-red-500 dark:bg-red-500',
      },
      success: {
        background: 'bg-emerald-200 dark:bg-emerald-500/30',
        bar: 'bg-emerald-500 dark:bg-emerald-500',
      },
    },
  },
  defaultVariants: {
    variant: 'default',
    rounded: 'full',
  },
})

interface ProgressBarProps
  extends React.HTMLProps<HTMLDivElement>,
    VariantProps<typeof progressBarVariants> {
  value?: number
  max?: number
  showAnimation?: boolean
  label?: string
}

const ProgressBar = React.forwardRef<
  HTMLDivElement,
  ProgressBarProps
>(
  (
    {
      value = 0,
      max = 100,
      label,
      showAnimation = false,
      variant,
      className,
      ...props
    }: ProgressBarProps,
    forwardedRef,
  ) => {
    const safeValue = Math.min(max, Math.max(value, 0))
    const { background, bar } = progressBarVariants({
      variant,
    })
    return (
      <div
        ref={forwardedRef}
        className={cn('flex w-full items-center', className)}
        role="progressbar"
        aria-label="Progress bar"
        aria-valuenow={value}
        aria-valuemax={max}
        tremor-id="tremor-raw"
        {...props}>
        <div
          className={cn(
            'relative flex h-[0.4rem] w-full items-center',
            background(),
          )}>
          <div
            className={cn(
              'h-full flex-col',
              bar(),
              showAnimation &&
                'transform-gpu transition-all duration-300 ease-in-out',
            )}
            style={{
              width:
                max ? `${(safeValue / max) * 100}%` : `${safeValue}%`,
            }}
          />
        </div>
        {label ?
          <span
            className={cn(
              // base
              'ml-2 whitespace-nowrap text-sm font-medium leading-none',
              // text color
              'text-gray-900 dark:text-gray-50',
            )}>
            {label}
          </span>
        : null}
      </div>
    )
  },
)

ProgressBar.displayName = 'ProgressBar'

export { ProgressBar, progressBarVariants, type ProgressBarProps }
