import { forwardRef } from 'react'
import { Link } from 'react-router'
import { ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/button.tsx'
import { cn } from '@/lib/utils.ts'
import { isHostedEnvironment } from '@/lib/environment.ts'

import type { ComponentProps } from 'react'
import type { LucideIcon } from 'lucide-react'

export interface FeaturedButtonOptions {
  variant?: 'primary' | 'secondary' | 'external'
  label: string
  href: string
  icon?: LucideIcon
  hostedOnly?: boolean
}

type FeaturedButtonProps = Omit<
  ComponentProps<typeof Button>,
  'variant'
> &
  FeaturedButtonOptions

const FeaturedButton = forwardRef<
  HTMLButtonElement,
  FeaturedButtonProps
>(
  (
    { variant, label, href, icon: Icon, className, hostedOnly },
    ref,
  ) => {
    const isHostedMode = isHostedEnvironment()

    if (!isHostedMode && hostedOnly) return null

    return (
      <Button
        ref={ref}
        size="sm"
        variant={
          variant === 'primary' ? 'outline'
          : variant === 'external' ?
            'link'
          : 'secondary'
        }
        className={cn(
          'group/featured-button text-muted-foreground hover:text-foreground cursor-default items-center gap-2 rounded-xl px-3 no-underline transition-colors duration-100',
          variant === 'primary' && 'text-foreground',
          className,
        )}
        asChild>
        <Link
          to={href}
          target={variant === 'external' ? '_blank' : '_top'}>
          {Icon && (
            <div className="flex size-5 items-center justify-center [&>svg]:size-4">
              <Icon />
            </div>
          )}
          <span>{label}</span>
          {variant === 'external' && (
            <div className="border-muted text-muted-foreground group-hover/featured-button:text-foreground flex size-4 items-center justify-center rounded-sm border bg-white transition-colors duration-100 dark:bg-black [&_svg]:size-3">
              <ArrowUpRight />
            </div>
          )}
        </Link>
      </Button>
    )
  },
)

FeaturedButton.displayName = 'SearchFeaturedButton'

export { FeaturedButton }
