import { AnimatePresence, motion } from 'framer-motion'
import { AddDependenciesPopover } from '@/components/explorer-grid/dependency-sidebar/add-dependency.tsx'
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Plus } from 'lucide-react'
import {
  useDependencySidebarStore,
  usePopover,
} from '@/components/explorer-grid/dependency-sidebar/context.tsx'

export const DependencyEmptyState = () => {
  const {
    dependencyPopoverOpen,
    setDependencyPopoverOpen,
    toggleAddDepPopover,
  } = usePopover()

  const dependencies = useDependencySidebarStore(
    state => state.dependencies,
  )

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      {dependencies.length === 0 && (
        <motion.div
          layout
          initial={{ opacity: 0, filter: 'blur(2px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, filter: 'blur(2px)' }}
          transition={{
            ease: 'easeInOut',
            duration: 0.25,
          }}
          className="flex min-h-96 w-full cursor-default flex-col items-center justify-center rounded-sm border-[1px] border-dashed border-muted py-12">
          <div className="mb-6 flex justify-center">
            <div className="relative">
              <div className="relative space-y-2">
                <div className="h-12 w-64 rotate-1 transform rounded-lg border-[1px] border-dashed border-muted-foreground/20 bg-muted/30" />

                <div className="-mt-10 h-12 w-64 -rotate-1 transform rounded-lg border-[1px] border-dashed border-muted-foreground/30 bg-muted/50" />

                <div className="relative z-10 -mt-10 flex h-12 w-64 items-center justify-between rounded-lg border-[1px] border-dashed border-muted-foreground/40 bg-background px-4">
                  <div className="flex items-center gap-3">
                    <div className="h-6 w-12 rounded border-[1px] border-dashed border-muted-foreground/30 bg-muted/60" />
                    <div className="h-4 w-24 rounded border-[1px] border-dashed border-muted-foreground/30 bg-muted/60" />
                  </div>
                  <div className="h-4 w-12 rounded border-[1px] border-dashed border-muted-foreground/30 bg-muted/60" />
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center gap-1 text-center">
            <h3 className="text-base font-medium tracking-tight text-foreground">
              No dependencies
            </h3>
            <p className="w-4/5 text-sm font-normal tracking-normal text-muted-foreground">
              Your project's dependencies will appear here, install
              one to see it appear
            </p>
            <Popover
              open={dependencyPopoverOpen}
              onOpenChange={setDependencyPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  onClick={toggleAddDepPopover}
                  className="mt-2 h-8 w-fit border-[1px] border-muted">
                  Install a dependency
                  <motion.span
                    animate={{
                      rotate: dependencyPopoverOpen ? 45 : 0,
                    }}>
                    <Plus />
                  </motion.span>
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="center"
                side="top"
                className="right-0 top-0 w-96 p-0">
                <AddDependenciesPopover />
              </PopoverContent>
            </Popover>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
