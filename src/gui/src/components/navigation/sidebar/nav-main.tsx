import { useLocation, NavLink } from 'react-router'
import menuItems from './menu.js'
import type { MenuItem } from './menu.js'
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

const SidebarMainNav = () => {
  const { pathname } = useLocation()

  const renderItems = (items: MenuItem[]) => {
    return items.map(item => {
      const hasSubItems = item.items?.length

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
                isActive={pathname === item.url}
                className="whitespace-nowrap data-[active=true]:bg-neutral-200/80 data-[active=true]:text-foreground data-[active=true]:dark:bg-neutral-700/80 data-[active=true]:dark:text-foreground"
                tooltip={item.title}>
                <NavLink to={item.url}>
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                  {hasSubItems && (
                    <>
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:hidden" />
                      <ChevronDown className="ml-auto transition-transform duration-200 group-data-[state=closed]/collapsible:hidden" />
                    </>
                  )}
                </NavLink>
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
