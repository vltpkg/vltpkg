import AppSidebarSublist from '@/components/sidebar/sidebar-sublist.tsx'
import { ScrollArea } from '@/components/ui/scroll-area.tsx'

import type { Props } from '@astrojs/starlight/props'

export type SidebarEntries = Props['sidebar']
export type SidebarEntry = SidebarEntries[0]

export type Link = Extract<SidebarEntry, { type: 'link' }>
export type Group = Extract<SidebarEntry, { type: 'group' }>

const AppSidebar = ({ sidebar }: { sidebar: SidebarEntries }) => {
  return (
    <aside
      className="sticky top-[101px] hidden max-h-[calc(100svh-104.25px)] min-h-[calc(100svh-104.25px)] w-[260px] flex-col bg-white pl-4 pr-4 dark:bg-black md:block"
      id="sidebar">
      <ScrollArea
        id="sidebar-scroll-area"
        className="max-h-[calc(100svh-104.25px)] min-h-[calc(100svh-104.25px)] w-[260px] overflow-y-auto py-4 pr-2">
        <AppSidebarSublist sidebar={sidebar} />
      </ScrollArea>
    </aside>
  )
}

export default AppSidebar
