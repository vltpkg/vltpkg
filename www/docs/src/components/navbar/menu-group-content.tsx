import {
  NavigationMenuContent,
  NavigationMenuLink,
} from '@/components/ui/navigation-menu'
import { cn } from 'cn'
import { isGroup, isItem } from './types'
import type { MenuGroup, MenuItem } from './types'
import { ListItem } from './list-item'

interface MenuGroupContentProps {
  group: MenuGroup
}

function MenuItemLink({
  item,
  featured = false,
}: {
  item: MenuItem
  featured?: boolean
}) {
  const Icon = item.icon

  return (
    <NavigationMenuLink
      href={item.path}
      target={item.target}
      className={cn(
        'w-full min-w-0',
        featured &&
          'col-span-2 rounded-sm border bg-neutral-50 px-3 py-3 hover:bg-neutral-100 dark:bg-neutral-950 dark:hover:bg-neutral-900',
      )}>
      <div
        className={cn(
          'grid min-w-0 gap-x-3',
          Icon ? 'grid-cols-[auto_1fr]' : 'grid-cols-1',
        )}>
        {Icon && (
          <div className="flex h-full">
            <div
              className={cn(
                'bg-background [&>svg]:text-foreground/80 flex aspect-square h-full min-h-9 items-center justify-center rounded-md border [&_img]:size-5 [&>svg]:size-5',
                featured && 'min-h-10',
              )}>
              <Icon />
            </div>
          </div>
        )}
        <div className="flex min-w-0 flex-col gap-0.5">
          <span
            className={cn(
              'text-foreground/90 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 font-medium',
              featured ? 'text-sm' : 'text-xs',
            )}>
            {item.label}
            {item.badge && (
              <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 font-sans text-[10px] leading-none font-medium text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                {item.badge}
              </span>
            )}
          </span>
          {item.subtitle && (
            <span className="text-muted-foreground text-xs font-medium text-pretty">
              {item.subtitle}
            </span>
          )}
        </div>
      </div>
    </NavigationMenuLink>
  )
}

export function MenuGroupContent({ group }: MenuGroupContentProps) {
  const hasNestedGroups = group.children.some(child => isGroup(child))
  const items = group.children.filter(isItem)
  const featuredItems = items.filter(item => item.featured)
  const regularItems = items.filter(item => !item.featured)
  const nestedGroups = group.children.filter(isGroup)

  if (hasNestedGroups) {
    return (
      <NavigationMenuContent className="bg-white p-1 pb-1.5 dark:bg-black">
        <div className="grid w-lg grid-cols-[1fr_auto] gap-2">
          <ul className="flex flex-col gap-1 p-2">
            {items.map((child, childIndex) => (
              <li key={childIndex} className="min-w-0">
                <MenuItemLink item={child} />
              </li>
            ))}
          </ul>
          <ul className="mr-0.5 space-y-2 rounded-sm border bg-neutral-50 p-2 dark:bg-neutral-950">
            {nestedGroups.map((child, childIndex) => (
              <li key={childIndex}>
                {child.children.map((nestedChild, nestedIndex) => {
                  if (isItem(nestedChild)) {
                    return (
                      <ListItem key={nestedIndex} {...nestedChild} />
                    )
                  }
                  return null
                })}
              </li>
            ))}
          </ul>
        </div>
      </NavigationMenuContent>
    )
  }

  return (
    <NavigationMenuContent className="bg-white p-1 pb-1.5 dark:bg-black">
      <ul className="grid w-md grid-cols-2 gap-1 p-2">
        {featuredItems.map((child, childIndex) => (
          <li
            key={`featured-${childIndex}`}
            className="col-span-2 min-w-0">
            <MenuItemLink item={child} featured />
          </li>
        ))}
        {regularItems.map((child, childIndex) => (
          <li key={childIndex} className="min-w-0">
            <MenuItemLink item={child} />
          </li>
        ))}
      </ul>
    </NavigationMenuContent>
  )
}
