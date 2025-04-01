import { useLocation, NavLink } from 'react-router'
import { helpMenuItems } from './menu.ts'
import {
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar.jsx'

export const HelpNav = () => {
  const { pathname } = useLocation()

  if (!pathname.includes('/help')) return null

  return (
    <>
      <SidebarGroupLabel className="font-medium tracking-wide">
        Help
      </SidebarGroupLabel>
      <SidebarMenu>
        {helpMenuItems.map(item => (
          <SidebarMenuItem key={item.url}>
            <SidebarMenuButton
              isActive={pathname === item.url}
              asChild
              tooltip={item.title}
              className="cursor-default whitespace-nowrap data-[active=true]:bg-neutral-200/80 data-[active=true]:text-foreground data-[active=true]:dark:bg-neutral-700/80 data-[active=true]:dark:text-foreground [&>svg]:scale-[2]">
              <NavLink to={item.url} className="text-foreground">
                {item.icon && <item.icon />}
                <span>{item.title}</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </>
  )
}
