import { type Props } from '@astrojs/starlight/props'

export type SidebarEntries = Props['sidebar']
export type SidebarEntry = SidebarEntries[0]

export type Link = Extract<SidebarEntry, { type: 'link' }>
export type Group = Extract<SidebarEntry, { type: 'group' }>

interface AppSidebarProps {
  children: React.ReactNode
}

const AppSidebar = ({ children }: AppSidebarProps) => {
  return (
    <aside className="sticky top-0">
      <AppSidebarDesktop>{children}</AppSidebarDesktop>
    </aside>
  )
}

export const AppSidebarDesktop = ({
  children,
}: {
  children: React.ReactNode
}) => {
  return (
    <div className="hidden h-[100vh] w-[200px] pb-8 md:block">
      {children}
    </div>
  )
}

export default AppSidebar
