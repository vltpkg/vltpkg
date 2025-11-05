import { Heading1, Code } from 'lucide-react'
import { Button } from '@/components/ui/button.tsx'
import { cn } from '@/lib/utils.ts'
import { motion } from 'framer-motion'

import type { LucideIcon } from 'lucide-react'
import type { View } from '@/components/explorer-grid/selected-item/tabs-code/types.ts'

export const ViewSwitcher = ({
  ...props
}: {
  activeView: View
  setView: (view: View) => void
}) => {
  return (
    <div
      className={cn(
        'flex h-8 items-center gap-2 rounded-xl border px-1 py-2',
        'border-neutral-300',
        'dark:border-neutral-700',
      )}>
      <ViewSwitcherButton
        value="code"
        icon={Code}
        label="Code"
        {...props}
      />
      <ViewSwitcherButton
        value="preview"
        icon={Heading1}
        label="Preview"
        {...props}
      />
    </div>
  )
}

const ViewSwitcherButton = ({
  activeView,
  setView,
  value,
  className,
  label,
  icon: Icon,
}: {
  activeView: View
  value: View
  className?: string
  setView: (view: View) => void
  label: string
  icon: LucideIcon
}) => {
  return (
    <Button
      variant="outline"
      size="sm"
      className={cn(
        'group/view-switcher text-muted-foreground relative h-6 rounded-lg border-none text-sm font-medium transition-colors duration-150',
        'bg-transparent',
        'dark:bg-transparent',
        className,
      )}
      onClick={() => setView(value)}>
      <span className="z-[2] inline-flex items-center gap-2">
        <Icon />
        <span>{label}</span>
      </span>

      {activeView === value && (
        <motion.div
          transition={{ type: 'spring', duration: 0.3, bounce: 0.1 }}
          layoutId="view-switcher-button"
          className={cn(
            'absolute inset-0 z-[1] rounded-lg border transition-colors duration-150',
            'border-neutral-300 bg-white group-hover/view-switcher:border-neutral-200 group-hover/view-switcher:bg-neutral-100',
            'dark:border-neutral-700 dark:bg-neutral-800 group-hover/view-switcher:dark:border-neutral-600 group-hover/view-switcher:dark:bg-neutral-700',
          )}
        />
      )}
    </Button>
  )
}
