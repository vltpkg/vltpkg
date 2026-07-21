import { cn } from '@/lib/utils.ts'

interface SecondaryNavItem {
  title: string
  path: string
}

const startItems: SecondaryNavItem[] = [
  { title: 'Registry', path: '/registry' },
  { title: 'CLI', path: '/cli' },
  { title: 'Guides', path: '/guides' },
  { title: 'API Reference', path: '/packages' },
]

const endItems: SecondaryNavItem[] = [
  { title: 'Blog', path: 'https://vlt.io/blog' },
  { title: 'Community', path: 'https://discord.com/invite/vltpkg' },
  { title: 'Feedback', path: '/feedback' },
]

const isActive = (pathname: string, path: string) =>
  pathname === path || pathname.startsWith(`${path}/`)

const SecondaryNav = ({ pathname = '' }: { pathname?: string }) => {
  return (
    <nav
      aria-label="Secondary"
      className="text-body flex w-full items-stretch justify-between gap-x-1 py-3">
      <div className="flex justify-start">
        {startItems.map(item => {
          const active = isActive(pathname, item.path)
          return (
            <a
              key={item.path}
              href={item.path}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center justify-center text-nowrap border-b-2 px-4 py-2 no-underline transition-colors',
                active ?
                  'border-foreground font-medium text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
              )}>
              {item.title}
            </a>
          )
        })}
      </div>

      <div className="flex justify-end">
        {endItems.map(item => {
          const active = isActive(pathname, item.path)
          return (
            <a
              key={item.path}
              href={item.path}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center justify-center text-nowrap border-b-2 px-4 py-2 no-underline transition-colors',
                active ?
                  'border-foreground font-medium text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
              )}>
              {item.title}
            </a>
          )
        })}
      </div>
    </nav>
  )
}

export default SecondaryNav
