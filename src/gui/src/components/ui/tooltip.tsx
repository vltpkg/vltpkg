import * as React from 'react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'

import { cn } from '@/lib/utils.ts'

const TooltipProvider = TooltipPrimitive.Provider

const TooltipPortal = TooltipPrimitive.Portal

const Tooltip = TooltipPrimitive.Root

const TooltipTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof TooltipPrimitive.Trigger>
>(({ ...props }, ref) => {
  return <TooltipPrimitive.Trigger ref={ref} {...props} />
})

TooltipTrigger.displayName = 'TooltipTrigger'

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      'border-muted bg-popover text-popover-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-[55] overflow-hidden rounded-xl border px-3 py-1.5 text-sm shadow-lg',
      className,
    )}
    {...props}
  />
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

export {
  Tooltip,
  TooltipPortal,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
}
