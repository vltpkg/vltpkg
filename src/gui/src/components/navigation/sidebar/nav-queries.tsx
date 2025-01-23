import { useEffect, useState } from 'react'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuBadge,
} from '@/components/ui/sidebar.jsx'
import { Star } from 'lucide-react'
import { useGraphStore } from '@/state/index.js'

const SidebarQueryNav = () => {
  const activeRoute = useGraphStore(state => state.activeRoute)
  const savedQueries = useGraphStore(state => state.savedQueries)
  const [queryCount, setQueryCount] = useState<number>(0)

  useEffect(() => {
    if (savedQueries) {
      setQueryCount(savedQueries.length)
    } else {
      setQueryCount(0)
    }
  }, [savedQueries])

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          isActive={activeRoute === '/queries'}
          asChild
          tooltip="Saved queries"
          className="data-[active=true]:bg-neutral-800 data-[active=true]:text-white data-[active=true]:dark:bg-neutral-100 data-[active=true]:dark:text-black">
          <a
            href="/queries"
            className={`text-foreground ${activeRoute === '/queries' ? '' : ''}`}>
            <Star />
            <span>Queries</span>
            <SidebarMenuBadge
              className={
                activeRoute === '/queries' ?
                  'text-white dark:text-black'
                : ''
              }>
              {queryCount !== 0 ? queryCount : undefined}
            </SidebarMenuBadge>
          </a>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

export { SidebarQueryNav }
