import menuItems from './menu.js'
import {
  SidebarMenuSub,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar.jsx'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible.jsx'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { MenuItem } from '@/components/navigation/sidebar/menu.js'
import { useGraphStore } from '@/state/index.js'

const SidebarMainNav = () => {
  const activeRoute = useGraphStore(state => state.activeRoute)

  const renderItems = (items: MenuItem[]) => {
    return items.map(item => {
      const hasSubItems = item.items && item.items.length > 0

      return (
        <Collapsible
          key={item.title}
          asChild
          defaultOpen={item.isActive}
          className="group/collapsible">
          <SidebarMenuItem>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton
                asChild
                isActive={activeRoute === item.url}
                className="data-[active=true]:bg-neutral-800 data-[active=true]:text-white data-[active=true]:dark:bg-neutral-100 data-[active=true]:dark:text-black whitespace-nowrap"
                tooltip={item.title}>
                {/**
                 * Urls that do not start with '/' are treated as external links
                 * and are therefore opened in a new window.
                 * */}
                <a
                  href={item.url}
                  target={
                    item.url.split('')[0] === '/' ? '_top' : '_blank'
                  }>
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                  {hasSubItems && (
                    <>
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:hidden" />
                      <ChevronDown className="ml-auto transition-transform duration-200 group-data-[state=closed]/collapsible:hidden" />
                    </>
                  )}
                </a>
              </SidebarMenuButton>
            </CollapsibleTrigger>
            {item.items && hasSubItems && (
              <CollapsibleContent>
                <SidebarMenuSub>
                  {renderItems(item.items)}
                </SidebarMenuSub>
              </CollapsibleContent>
            )}
          </SidebarMenuItem>
        </Collapsible>
      )
    })
  }

  return <SidebarMenu>{renderItems(menuItems)}</SidebarMenu>
}

export { SidebarMainNav }
