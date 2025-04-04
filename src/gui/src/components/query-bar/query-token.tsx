import * as React from 'react'
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils.js'
import type { VariantProps } from 'class-variance-authority'
import type { ParsedSelectorToken } from '@vltpkg/query'

type TokenType = ParsedSelectorToken['type']

export const tokenVariantClasses = {
  pseudo: {
    light: 'text-purple-700 after:bg-purple-600/10',
    dark: 'dark:text-purple-400 after:dark:bg-purple-600/20',
  },
  attribute: {
    light: 'text-blue-700 after:bg-blue-600/10',
    dark: 'dark:text-blue-400 after:dark:bg-blue-600/15',
  },
  class: {
    light: 'text-green-700 after:bg-green-600/10',
    dark: 'dark:text-green-400 after:dark:bg-green-600/15',
  },
  id: {
    light: 'text-pink-700 after:bg-pink-600/10',
    dark: 'dark:text-pink-400 after:dark:bg-pink-600/15',
  },
  combinator: {
    light: 'text-gray-700 after:bg-gray-600/10',
    dark: 'dark:text-gray-400 after:dark:bg-gray-600/20',
  },
} satisfies Record<TokenType, { light: string; dark: string }>

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
