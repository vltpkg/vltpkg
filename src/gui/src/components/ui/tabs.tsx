import * as React from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cva } from 'class-variance-authority'
import type { VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils.js'

const Tabs = TabsPrimitive.Root

const tabsListVariants = cva('inline-flex ', {
  variants: {
    variant: {
      default:
        'items-center justify-center h-10 rounded-md bg-muted p-1 text-muted-foreground',
      outline: 'border-b-[1px] w-full',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
})
const tabsTriggerVariants = cva(
  'inline-flex items-center justify-center',
  {
    variants: {
      variant: {
        default:
          'whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm',
        outline:
          'relative px-3 py-1.5 text-sm font-medium after:mt-[1px] after:absolute after:inset-0 after:border-b-[1px] after:border-transparent after:data-[state=active]:border-muted-foreground after:content=[""] after:h-full after:w-full ring-offset-background transition-all data-[state=active]:text-foreground text-muted-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)
interface TabsListProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>,
    VariantProps<typeof tabsListVariants> {}

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  TabsListProps
>(({ className, variant, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(tabsListVariants({ variant, className }))}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

interface TabsTriggerProps
  extends React.ComponentPropsWithoutRef<
      typeof TabsPrimitive.Trigger
    >,
    VariantProps<typeof tabsTriggerVariants> {}

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  TabsTriggerProps
>(({ className, disabled, variant, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    disabled={disabled}
    className={cn(
      tabsTriggerVariants({ variant, className }),
      disabled ?
        'disabled:pointer-events-none disabled:opacity-50'
      : '',
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      'ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      className,
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
