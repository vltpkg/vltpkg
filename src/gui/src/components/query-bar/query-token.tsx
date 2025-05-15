import * as React from 'react'
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils.ts'
import type { VariantProps } from 'class-variance-authority'
import type { ParsedSelectorToken } from '@vltpkg/query'

type TokenType = ParsedSelectorToken['type']

const defaultVariant = {
  light: 'text-gray-800 after:bg-gray-500/20',
  dark: 'dark:text-gray-300 after:dark:bg-gray-500/20',
}

export const tokenVariantClasses = {
  pseudo: {
    light: 'text-purple-800 after:bg-purple-600/20',
    dark: 'dark:text-purple-400 after:dark:bg-purple-600/20',
  },
  attribute: {
    light: 'text-blue-800 after:bg-blue-600/20',
    dark: 'dark:text-blue-400 after:dark:bg-blue-600/15',
  },
  class: {
    light: 'text-green-800 after:bg-green-600/20',
    dark: 'dark:text-green-400 after:dark:bg-green-600/15',
  },
  tag: {
    light: 'text-emerald-800 after:bg-emerald-600/20',
    dark: 'dark:text-emerald-400 after:dark:bg-emerald-600/15',
  },
  id: {
    light: 'text-pink-800 after:bg-pink-600/20',
    dark: 'dark:text-pink-400 after:dark:bg-pink-600/15',
  },
  string: {
    light: 'text-violet-800 after:bg-violet-500/20',
    dark: 'dark:text-violet-300 after:dark:bg-violet-500/20',
  },
  universal: {
    light: 'text-fuchsia-800 after:bg-fuchsia-600/20',
    dark: 'dark:text-fuchsia-400 after:dark:bg-fuchsia-600/20',
  },
  combinator: defaultVariant,
  comment: defaultVariant,
  selector: defaultVariant,
}

const variantMap: Record<TokenType, string> = Object.fromEntries(
  Object.entries(tokenVariantClasses).map(([key, value]) => [
    key,
    `${value.light} ${value.dark}`,
  ]),
) as Record<TokenType, string>

const tokenVariants = cva(
  'relative z-[2] whitespace-pre text-black dark:text-white text-sm after:absolute after:inset-0 after:z-[-1] after:rounded-sm after:content-[""]',
  {
    variants: {
      variant: variantMap,
    },
  },
)

export type QueryTokenProps = React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof tokenVariants>

const QueryToken = React.forwardRef<HTMLSpanElement, QueryTokenProps>(
  ({ className, variant, ...props }, ref) => {
    return (
      <span
        className={cn(tokenVariants({ variant, className }))}
        ref={ref}
        {...props}
      />
    )
  },
)
QueryToken.displayName = 'Query Token'

export { QueryToken, tokenVariants }
