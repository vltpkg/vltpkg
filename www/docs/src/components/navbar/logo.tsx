import NextLink from 'next/link'
import { Button } from '@/components/ui/button'
import { Vlt } from '@/components/icons/vlt'
import { cn } from 'cn'

import type { ComponentProps } from 'react'

// vlt.io's logo without its brand-kit context menu; links to the docs home
export const Logo = ({
  className,
  ...rest
}: ComponentProps<typeof Button>) => (
  <Button
    {...rest}
    variant="ghost"
    className={cn('h-9 p-0 has-[>svg]:px-0', className)}
    asChild>
    <NextLink
      href="/"
      className="cursor-pointer"
      aria-label="vlt docs home">
      <Vlt className="size-6" aria-hidden="true" />
      <p className="bg-linear-to-tr from-neutral-600 to-neutral-950 bg-clip-text py-1 text-lg font-semibold dark:from-neutral-500 dark:to-neutral-100">
        vlt{' '}
        <span className="text-muted-foreground font-normal">
          / docs
        </span>
      </p>
    </NextLink>
  </Button>
)
