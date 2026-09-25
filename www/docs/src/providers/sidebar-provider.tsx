import { SidebarProvider as ShadcnSidebarProvider } from '@/components/ui/sidebar'

export const SidebarProvider = ({
  children,
}: Readonly<{ children: React.ReactNode }>) => {
  return (
    // column: the navbar sits on top, sidebar + content share the row below it
    <ShadcnSidebarProvider
      className="flex-col"
      style={
        {
          '--sidebar-width': '18rem',
          '--header-height': '3.5rem',
        } as React.CSSProperties
      }>
      {children}
    </ShadcnSidebarProvider>
  )
}
