import { Fragment } from 'react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover.tsx'
import { cn } from '@/lib/utils.ts'
import { ChevronDown } from 'lucide-react'
import { menuData } from '@/components/navigation/linear-menu/data.ts'
import { UserLinearMenu } from '@/components/auth/user-linear-menu.tsx'

import type { MenuItem } from '@/components/navigation/linear-menu/data.ts'

export const LinearMenu = () => {
  return (
    <Fragment>
      <div className="hidden h-10 items-center gap-x-2 rounded-xl border-[1px] bg-white p-1 text-sm md:flex dark:bg-neutral-950">
        {menuData.map(item =>
          item.children ?
            <MenuGroup key={item.title} item={item} />
          : <MenuLink key={item.title} item={item} />,
        )}
      </div>
      <UserLinearMenu />
    </Fragment>
  )
}

const MenuGroup = ({ item }: { item: MenuItem }) => {
  const { title, children } = item

  return (
    <Popover>
      <PopoverTrigger className="inline-flex cursor-default items-center gap-1.5 rounded-lg bg-transparent px-3 py-1.5 text-sm text-neutral-800 transition-colors duration-250 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-900">
        {title}
        <ChevronDown size={12} />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="flex w-[224px] flex-col gap-1 rounded-lg bg-white p-1 dark:bg-neutral-950">
        {children?.map((child, idx) => (
          <MenuLink key={idx} item={child} />
        ))}
      </PopoverContent>
    </Popover>
  )
}

const MenuLink = ({
  item,
  className,
}: {
  item: MenuItem
  className?: string
}) => {
  const { title, path, target, icon: Icon } = item

  return (
    <a
      target={target}
      href={path}
      className={cn(
        'inline-flex cursor-default items-center gap-x-3 rounded-lg bg-transparent px-3 py-1.5 text-sm text-nowrap text-neutral-800 transition-colors duration-250 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-900',
        className,
      )}>
      {Icon && (
        <Icon className="border-border rounded-sm border-[1px] dark:border-neutral-800" />
      )}
      <span>{title}</span>
    </a>
  )
}
