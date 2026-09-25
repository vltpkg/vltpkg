import { TooltipProvider as ShadcnTooltipProvider } from '@/components/ui/tooltip'

export const TooltipProvider = ({
  children,
}: Readonly<{ children: React.ReactNode }>) => {
  return <ShadcnTooltipProvider>{children}</ShadcnTooltipProvider>
}
