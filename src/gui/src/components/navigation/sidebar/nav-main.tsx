import menuItems, { type MenuItem } from './menu.js'
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
import { useGraphStore } from '@/state/index.js'

const SidebarMainNav = () => {
  const activeRoute = useGraphStore(state => state.activeRoute)

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
                isActive={activeRoute === item.url}
                className="whitespace-nowrap data-[active=true]:bg-neutral-800 data-[active=true]:text-white data-[active=true]:dark:bg-neutral-100 data-[active=true]:dark:text-black"
                tooltip={item.title}>
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
