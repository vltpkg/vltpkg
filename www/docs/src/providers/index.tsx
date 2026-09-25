import { NextThemesProvider } from './next-themes'
import { SidebarProvider } from './sidebar-provider'
import { TooltipProvider } from './tooltip-provider'
import { Toaster } from '@/components/ui/sonner'

export const Providers = ({
  children,
}: Readonly<{ children: React.ReactNode }>) => {
  return (
    <NextThemesProvider>
      <TooltipProvider>
        <SidebarProvider>{children}</SidebarProvider>
      </TooltipProvider>
      <Toaster />
    </NextThemesProvider>
  )
}
