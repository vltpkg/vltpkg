import { NavLink } from 'react-router'
import { NavigationMenuLink } from '@/components/ui/navigation-menu.tsx'
import { cn } from '@/lib/utils.ts'

import type { ComponentProps } from 'react'
import type { MenuItem } from './types.ts'

type ListItemProps = ComponentProps<typeof NavigationMenuLink> &
  MenuItem

const isExternalLink = (href: string) => {
  return href.startsWith('http://') || href.startsWith('https://')
}

export function ListItem({
  label,
  blurb,
  icon: Icon,
  className,
  path,
  target,
  ...props
}: ListItemProps) {
  const isExternal = isExternalLink(path)

  const content = (
    <>
      {Icon && (
        <div className="bg-background/40 flex aspect-square size-8 items-center justify-center rounded-md border shadow-sm">
          <Icon
            className="text-foreground size-5"
            aria-hidden="true"
          />
        </div>
      )}
      <div className="flex flex-col items-start justify-center">
        <span className="font-medium">{label}</span>
        {blurb && (
          <span className="text-muted-foreground text-xs">
            {blurb}
          </span>
        )}
      </div>
      {isExternal && (
        <span className="sr-only">(opens in new window)</span>
      )}
    </>
  )

  return (
    <NavigationMenuLink
      className={cn('w-full flex-row gap-x-2', className)}
      {...props}
      asChild>
      {isExternal ?
        <a href={path} target={target} rel="noopener noreferrer">
          {content}
        </a>
      : <NavLink to={path}>{content}</NavLink>}
    </NavigationMenuLink>
  )
}
