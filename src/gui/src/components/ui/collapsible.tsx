import * as React from 'react'
import * as CollapsiblePrimitive from '@radix-ui/react-collapsible'
import { AnimatePresence, motion } from 'framer-motion'
import type { MotionProps } from 'framer-motion'

interface CollapsibleContextValue {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const CollapsibleContext = React.createContext<
  CollapsibleContextValue | undefined
>(undefined)

const useCollapsibleContext = () => {
  const context = React.useContext(CollapsibleContext)
  if (context === undefined) {
    throw new Error(
      'useCollapsibleContext must be used within a CollapsibleProvider',
    )
  }
  return context
}

interface CollapsibleProps
  extends React.ComponentPropsWithoutRef<
    typeof CollapsiblePrimitive.Root
  > {}

const Collapsible = ({
  open,
  onOpenChange,
  ...props
}: CollapsibleProps) => {
  return (
    <CollapsibleContext.Provider value={{ open, onOpenChange }}>
      <CollapsiblePrimitive.Root
        open={open}
        onOpenChange={onOpenChange}
        {...props}
      />
    </CollapsibleContext.Provider>
  )
}

interface CollapsibleTriggerProps
  extends React.ComponentPropsWithoutRef<
    typeof CollapsiblePrimitive.Trigger
  > {}

const CollapsibleTrigger = ({
  ...props
}: CollapsibleTriggerProps) => {
  return <CollapsiblePrimitive.CollapsibleTrigger {...props} />
}

interface CollapsibleContentProps
  extends React.ComponentPropsWithRef<
    typeof CollapsiblePrimitive.Content
  > {}

/**
 * We can supercharge the primitive by wrapping it in a `motion.create(<react-element>)`,
 * in React 18, we must use forwardRef to wrap their components and
 * and pass ref to the element we want to animate.
 */

const MotionContent = motion.create(CollapsiblePrimitive.Content)

/**
 * Radix's CollapsibleContent primitive removes itself from the DOM when `open`
 * is false, which prevent animating an exit state.
 *
 * We pass `forceMount` to keep the content in the DOM.
 */

const CollapsibleContent = React.forwardRef<
  HTMLDivElement,
  CollapsibleContentProps & MotionProps
>(({ children, ...props }, ref) => {
  const { open } = useCollapsibleContext()

  return (
    <AnimatePresence>
      {open && (
        <MotionContent
          layout
          className="overflow-hidden"
          forceMount
          initial={{ height: 0 }}
          animate={{ height: 'auto' }}
          exit={{ height: 0 }}
          {...props}
          ref={ref}>
          {children}
        </MotionContent>
      )}
    </AnimatePresence>
  )
})

CollapsibleContent.displayName = 'CollapsibleContent'

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
