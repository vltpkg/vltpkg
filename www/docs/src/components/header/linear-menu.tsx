import { useState, useEffect } from 'react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ChevronDown } from 'lucide-react'
import { Icon } from '@/components/icon'

const usePathname = () => {
  return window.location.href
}

interface MenuItem {
  icon?: string
  title: string
  path?: string
  children?: MenuItem[]
}

const LinearMenu = () => {
  const menuData: MenuItem[] = [
    {
      title: 'Product',
      children: [
        {
          icon: 'client',
          title: 'Client',
          path: 'https://vlt.sh/client',
        },
        {
          icon: 'serverless-registry',
          title: 'Serverless Registry',
          path: 'https://vlt.sh/serverless-registry',
        },
      ],
    },
    { title: 'Docs', path: 'https://docs.vlt.sh/' },
    { title: 'Blog', path: 'https://blog.vlt.sh/' },
    { title: 'Company', path: 'https://vlt.sh/company' },
  ]

  return (
    <nav className="hidden items-center gap-x-2 rounded-[1rem] bg-white/95 p-2 text-base text-neutral-950 shadow-[0_0_0_1px_theme(colors.black/5%)] backdrop-blur-sm dark:bg-neutral-950/75 dark:text-white dark:shadow-[0_0_0_1px_theme(colors.white/10%)] md:flex">
      {menuData.map(item =>
        item.children ?
          <MenuGroup key={item.title} item={item} />
        : <MenuLink key={item.title} item={item} />,
      )}
    </nav>
  )
}

const MenuGroup = ({ item }: { item: MenuItem }) => {
  const [open, setOpen] = useState(false)
  const location = usePathname()
  useEffect(() => {
    setOpen(false)
  }, [location])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="inline-flex cursor-pointer items-center gap-1.5 rounded-[8px] bg-transparent px-4 py-1.5 text-base hover:bg-black/5 dark:hover:bg-white/10">
        {item.title}
        <ChevronDown
          size={12}
          className="mt-[3px] text-neutral-700 dark:text-neutral-400"
        />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="flex w-[224px] flex-col gap-1 rounded-[8px] border border-white/10 bg-neutral-900 px-1 py-1 text-foreground shadow-xl shadow-white/5 [&>a]:rounded-[5px]">
        {item.children?.map((child, idx) => (
          <MenuLink className="text-white" key={idx} item={child} />
        ))}{' '}
      </PopoverContent>
    </Popover>
  )
}

const MenuLink = ({
  item,
  className = '',
}: {
  item: MenuItem
  className?: string
}) => {
  return !item.path ?
      <span
        className={`inline-flex items-center gap-x-3 text-nowrap px-3 py-3 ${className}`}>
        {item.icon ?
          <MenuLinkIcon item={item} />
        : null}{' '}
        {item.title}
      </span>
    : <a
        href={item.path}
        className={`group inline-flex items-center gap-x-3 text-nowrap rounded-[8px] px-4 py-1.5 text-base text-foreground no-underline hover:bg-black/5 dark:hover:bg-white/10 ${className}`}>
        {item.icon ?
          <MenuLinkIcon item={item} />
        : null}{' '}
        {item.title}
      </a>
}

const MenuLinkIcon = ({ item }: { item: MenuItem }) => {
  if (!item.icon) {
    return null
  }
  return (
    <span className="group-hover:border-white/3 flex size-[1.75rem] flex-shrink-0 items-center justify-center rounded-[6px] border border-black/5 bg-black/5 group-hover:bg-white/15 dark:border-white/10 dark:bg-white/10">
      <Icon name={item.icon} className="size-[1rem] text-white" />
    </span>
  )
}

export default LinearMenu
