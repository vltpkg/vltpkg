import * as React from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cva } from 'class-variance-authority'
import type { VariantProps } from 'class-variance-authority'
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion'
import { cn } from '@/lib/utils.js'

interface TabsContextValue {
  activeValue: string | undefined
  focused: string | undefined | null
  setFocused: (focused: string | undefined | null) => void
}

const TabsContext = React.createContext<TabsContextValue | undefined>(
  undefined,
)

const useTabsContext = () => {
  const context = React.useContext(TabsContext)
  if (context === undefined) {
    throw new Error(
      'useTabsContext must be used within a TabsProvider',
    )
  }
  return context
}

interface TabsProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Tabs> {}

const Tabs = ({ value: activeValue, ...rest }: TabsProps) => {
  const [focused, setFocused] = React.useState<
    string | undefined | null
  >(null)

  return (
    <TabsContext.Provider
      value={{ activeValue, focused, setFocused }}>
      <TabsPrimitive.Root
        className="relative"
        value={activeValue}
        {...rest}
      />
    </TabsContext.Provider>
  )
}

const tabsListVariants = cva('inline-flex ', {
  variants: {
    variant: {
      default:
        'items-center justify-center h-10 rounded-md bg-muted p-1 text-muted-foreground',
      outline: 'border-b-[1px] border-muted w-full',
      ghost: 'pb-1 bg-transparent border-b-[2px] border-muted w-full',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
})
const tabsTriggerVariants = cva(
  'cursor-default inline-flex items-center justify-center',
  {
    variants: {
      variant: {
        default:
          'whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm',
        outline:
          'relative px-3 py-1.5 text-sm font-medium after:mt-[1px] after:absolute after:inset-0 after:border-b-[1px] after:border-transparent after:data-[state=active]:border-muted-foreground after:content=[""] after:h-full after:w-full ring-offset-background transition-all data-[state=active]:text-foreground text-muted-foreground',
        ghost: 'text-sm font-medium px-0 py-1.5',
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
>(({ className, variant, ...props }, ref) => {
  const { setFocused } = useTabsContext()

  return (
    <TabsPrimitive.List
      onMouseLeave={() => setFocused(null)}
      ref={ref}
      className={cn(tabsListVariants({ variant, className }))}
      {...props}
    />
  )
})
TabsList.displayName = TabsPrimitive.List.displayName

interface TabsTriggerProps
  extends React.ComponentPropsWithoutRef<
      typeof TabsPrimitive.Trigger
    >,
    VariantProps<typeof tabsTriggerVariants> {}

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  TabsTriggerProps
>(
  (
    { value, className, children, disabled, variant, ...props },
    ref,
  ) => {
    const { activeValue, focused, setFocused } = useTabsContext()

    return (
      <LayoutGroup>
        <TabsPrimitive.Trigger
          ref={ref}
          onFocus={() => setFocused(value)}
          onMouseOver={() => setFocused(value)}
          value={value}
          disabled={disabled}
          className={cn(
            'relative',
            tabsTriggerVariants({ variant, className }),
            disabled ?
              'disabled:pointer-events-none disabled:opacity-50'
            : '',
          )}
          {...props}>
          <span className="z-[2]">{children}</span>

          {variant === 'ghost' && (
            <>
              <AnimatePresence>
                {focused === value && (
                  <motion.div
                    layoutId="tabs-highlight"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{
                      layout: {
                        duration: 0.5,
                        ease: [0.16, 1, 0.3, 1],
                      },
                      opacity: {
                        duration: 0.5,
                        ease: [0.16, 1, 0.3, 1],
                      },
                    }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-[1] h-full w-full rounded-sm bg-neutral-200/75 dark:bg-muted/80"
                  />
                )}
              </AnimatePresence>

              {activeValue === value && (
                <motion.div
                  layoutId="tabs-underline"
                  className="absolute -bottom-[6px] h-[2px] w-full bg-primary"
                  transition={{
                    layout: {
                      duration: 0.5,
                      ease: [0.16, 1, 0.3, 1],
                    },
                  }}
                />
              )}
            </>
          )}
        </TabsPrimitive.Trigger>
      </LayoutGroup>
    )
  },
)
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
