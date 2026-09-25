import Link from 'next/link'
import { NavigationMenuLink } from '@/components/ui/navigation-menu'
import { cn } from 'cn'

import type { ComponentProps } from 'react'
import type { MenuItem } from './types'

type ListItemProps = ComponentProps<typeof NavigationMenuLink> &
  MenuItem

const isExternalLink = (href: string) => {
  return href.startsWith('http://') || href.startsWith('https://')
}

export function ListItem({
  label,
  blurb,
  badge,
  icon: Icon,
  className,
  path,
  target,
  ...props
}: ListItemProps) {
  const isExternal = isExternalLink(path)

  const content = (
    <div
      className={cn(
        'grid w-full min-w-0 gap-x-2',
        Icon ? 'grid-cols-[auto_1fr]' : 'grid-cols-1',
      )}>
      {Icon && (
        <div className="flex h-full">
          <div className="bg-background/40 flex aspect-square h-full min-h-8 items-center justify-center rounded-md border shadow-sm">
            <Icon
              className="text-foreground size-5"
              aria-hidden="true"
            />
          </div>
        </div>
      )}
      <div className="flex min-w-0 flex-col items-start justify-center">
        <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 font-medium">
          {label}
          {badge && (
            <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] leading-none font-medium text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
              {badge}
            </span>
          )}
        </span>
        {blurb && (
          <span className="text-muted-foreground text-xs text-pretty">
            {blurb}
          </span>
        )}
        {isExternal && (
          <span className="sr-only">(opens in new window)</span>
        )}
      </div>
    </div>
  )

  return (
    <NavigationMenuLink
      className={cn(
        'w-full min-w-0 flex-row items-stretch gap-x-2',
        className,
      )}
      {...props}
      asChild>
      {isExternal ?
        <a href={path} target={target} rel="noopener noreferrer">
          {content}
        </a>
      : <Link href={path}>{content}</Link>}
    </NavigationMenuLink>
  )
}
