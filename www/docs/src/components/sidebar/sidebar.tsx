import type { Props } from '@astrojs/starlight/props'
import AppSidebarSublist from '@/components/sidebar/sidebar-sublist.tsx'
import { ScrollArea } from '@/components/ui/scroll-area.tsx'
import { Button } from '@/components/ui/button.tsx'

export type SidebarEntries = Props['sidebar']
export type SidebarEntry = SidebarEntries[0]

export type Link = Extract<SidebarEntry, { type: 'link' }>
export type Group = Extract<SidebarEntry, { type: 'group' }>

interface SidebarDefaultListItem {
  slug: string
  href: string
  icon: React.FC<React.SVGProps<SVGSVGElement>>
  className?: string
  external?: boolean
}

const defaultList: SidebarDefaultListItem[] = [
  {
    slug: 'Documentation',
    href: '/',
    icon: () => (
      <img
        src="/icons/command.svg"
        className="size-5 dark:invert dark:filter"
      />
    ),
    className: 'text-primary',
  },
]

const DefaultSublist = () => {
  return (
    <div className="mb-1 flex flex-col gap-1">
      {defaultList.map((item, idx) => (
        <Button
          className="group"
          variant="sidebar"
          size="sidebar"
          asChild
          key={idx}>
          <a
            href={item.href}
            target={item.external ? '_blank' : '_self'}
            role="link"
            className={`inline-flex items-center gap-1 ${item.className}`}>
            <span className="flex h-[24px] w-[24px] items-center justify-center rounded-sm border-[1px] border-border bg-background p-1.5 transition-all duration-200 group-hover:bg-secondary">
              <item.icon className="text-neutral-500" />
            </span>
            {item.slug}
          </a>
        </Button>
      ))}
    </div>
  )
}

const AppSidebar = ({ sidebar }: { sidebar: SidebarEntries }) => {
  return (
    <aside
      className="sticky top-[101px] hidden max-h-[calc(100svh-104.25px)] min-h-[calc(100svh-104.25px)] w-[260px] flex-col bg-white pl-4 pr-4 dark:bg-black md:block"
      id="sidebar">
      <ScrollArea
        id="sidebar-scroll-area"
        className="max-h-[calc(100svh-104.25px)] min-h-[calc(100svh-104.25px)] w-[260px] overflow-y-auto py-4 pr-2">
        <DefaultSublist />
        <AppSidebarSublist sidebar={sidebar} />
      </ScrollArea>
    </aside>
  )
}

export default AppSidebar
