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
          className="cursor-default whitespace-nowrap data-[active=true]:bg-neutral-200/80 data-[active=true]:text-foreground data-[active=true]:dark:bg-neutral-700/80 data-[active=true]:dark:text-foreground">
          <a
            href="/queries"
            className={`text-foreground ${activeRoute === '/queries' ? '' : ''}`}>
            <Star />
            <span>Queries</span>
            <SidebarMenuBadge>
              {queryCount !== 0 ? queryCount : undefined}
            </SidebarMenuBadge>
          </a>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

export { SidebarQueryNav }
