import * as React from 'react'
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog'

import { cn } from '@/lib/utils.ts'
import { buttonVariants } from '@/components/ui/button.tsx'

const AlertDialog = ({
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Root>) => {
  return (
    <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />
  )
}

const AlertDialogTrigger = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Trigger>
>(({ ...props }, ref) => {
  return (
    <AlertDialogPrimitive.Trigger
      ref={ref}
      data-slot="alert-dialog-trigger"
      {...props}
    />
  )
})
AlertDialogTrigger.displayName =
  AlertDialogPrimitive.Trigger.displayName

const AlertDialogPortal = ({
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Portal>) => {
  return (
    <AlertDialogPrimitive.Portal
      data-slot="alert-dialog-portal"
      {...props}
    />
  )
}

const AlertDialogOverlay = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>
>(({ className, ...props }, ref) => {
  return (
    <AlertDialogPrimitive.Overlay
      ref={ref}
      data-slot="alert-dialog-overlay"
      className={cn(
        'fixed inset-0 z-50 bg-black/50 duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        className,
      )}
      {...props}
    />
  )
})
AlertDialogOverlay.displayName =
  AlertDialogPrimitive.Overlay.displayName

const AlertDialogContent = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>
>(({ className, ...props }, ref) => {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        ref={ref}
        data-slot="alert-dialog-content"
        className={cn(
          'fixed left-[50%] top-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] origin-center translate-x-[-50%] translate-y-[-50%] gap-4 rounded-xl border bg-background p-6 shadow-lg duration-300 data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:max-w-lg',
          className,
        )}
        {...props}
      />
    </AlertDialogPortal>
  )
})
AlertDialogContent.displayName =
  AlertDialogPrimitive.Content.displayName

const AlertDialogHeader = ({
  className,
  ...props
}: React.ComponentProps<'div'>) => {
  return (
    <div
      data-slot="alert-dialog-header"
      className={cn(
        'flex flex-col gap-2 text-center sm:text-left',
        className,
      )}
      {...props}
    />
  )
}

const AlertDialogFooter = ({
  className,
  ...props
}: React.ComponentProps<'div'>) => {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn(
        'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end',
        className,
      )}
      {...props}
    />
  )
}

const AlertDialogTitle = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(({ className, ...props }, ref) => {
  return (
    <AlertDialogPrimitive.Title
      ref={ref}
      data-slot="alert-dialog-title"
      className={cn(
        'text-lg font-medium tracking-tighter',
        className,
      )}
      {...props}
    />
  )
})
AlertDialogTitle.displayName = AlertDialogPrimitive.Title.displayName

const AlertDialogDescription = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<
    typeof AlertDialogPrimitive.Description
  >
>(({ className, ...props }, ref) => {
  return (
    <AlertDialogPrimitive.Description
      ref={ref}
      data-slot="alert-dialog-description"
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  )
})
AlertDialogDescription.displayName =
  AlertDialogPrimitive.Description.displayName

const AlertDialogAction = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Action>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action>
>(({ className, ...props }, ref) => {
  return (
    <AlertDialogPrimitive.Action
      ref={ref}
      className={cn(
        buttonVariants({ variant: 'default', size: 'sm' }),
        'rounded-lg',
        className,
      )}
      {...props}
    />
  )
})
AlertDialogAction.displayName =
  AlertDialogPrimitive.Action.displayName

const AlertDialogCancel = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Cancel>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>
>(({ className, ...props }, ref) => {
  return (
    <AlertDialogPrimitive.Cancel
      ref={ref}
      className={cn(
        buttonVariants({ variant: 'outline', size: 'sm' }),
        'rounded-lg',
        className,
      )}
      {...props}
    />
  )
})
AlertDialogCancel.displayName =
  AlertDialogPrimitive.Cancel.displayName

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
}
