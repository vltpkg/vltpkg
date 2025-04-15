import * as React from 'react'
import { cva } from 'class-variance-authority'
import type { VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils.js'

const glyphIconVariants = cva('font-zed antialised', {
  variants: {
    size: {
      xs: 'text-xs',
      sm: 'text-sm',
      md: 'text-md',
      lg: 'text-lg',
      xl: 'text-xl',
    },
    color: {
      default: 'text-current',
      green: 'text-green-600 dark:text-green-500',
      red: 'text-red-600 dark:text-red-500',
      blue: 'text-blue-600 dark:text-blue-500',
      yellow: 'text-yellow-600 dark:text-yellow-500',
      purple: 'text-purple-600 dark:text-purple-500',
      pink: 'text-pink-600 dark:text-pink-500',
      gray: 'text-gray-600 dark:text-gray-500',
    },
  },
  defaultVariants: {
    size: 'sm',
    color: 'default',
  },
})

export const ICONS = {
  node: '\uED0D',
  npm: '\ued0e',
  yarn: '\ue6a7',
  bun: '\ue76f',
  pnpm: '\ue865',
  deno: '\ue7c0',
  'eye-off': '\uf4c5',
}

export type GlyphIconProps = React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof glyphIconVariants> & {
    asChild?: boolean
    icon: keyof typeof ICONS
  }

export const GlyphIcon = React.forwardRef<
  HTMLSpanElement,
  GlyphIconProps
>(({ className, size, color, icon, children, ...props }, ref) => {
  return (
    <span
      ref={ref}
      className={cn(glyphIconVariants({ size, color }), className)}
      {...props}>
      {ICONS[icon]}
      {children}
    </span>
  )
})

GlyphIcon.displayName = 'GlyphIcon'
