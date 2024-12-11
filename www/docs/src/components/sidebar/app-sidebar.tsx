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
    <div
      className="hidden md:block h-[100vh] pb-8"
      style={{
        width: 300,
      }}>
      {children}
    </div>
  )
}

export default AppSidebar
