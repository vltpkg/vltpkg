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
  const importerId = useDependencySidebarStore(
    state => state.importerId,
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
          className="border-muted bg-card flex min-h-96 w-full cursor-default flex-col items-center justify-center rounded-xl border-[1px] border-dashed py-12">
          <div className="mb-6 flex justify-center">
            <div className="relative">
              <div className="relative space-y-2">
                <div className="border-muted-foreground/20 bg-muted/30 h-12 w-64 rotate-1 transform rounded-xl border-[1px] border-dashed" />

                <div className="border-muted-foreground/30 bg-muted/50 -mt-10 h-12 w-64 -rotate-1 transform rounded-xl border-[1px] border-dashed" />

                <div className="border-muted-foreground/40 bg-background relative z-10 -mt-10 flex h-12 w-64 items-center justify-between rounded-xl border-[1px] border-dashed px-4">
                  <div className="flex items-center gap-3">
                    <div className="border-muted-foreground/30 bg-muted/60 h-6 w-12 rounded-lg border-[1px] border-dashed" />
                    <div className="border-muted-foreground/30 bg-muted/60 h-4 w-24 rounded-lg border-[1px] border-dashed" />
                  </div>
                  <div className="border-muted-foreground/30 bg-muted/60 h-4 w-12 rounded-lg border-[1px] border-dashed" />
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center gap-1 text-center">
            <h3 className="text-foreground text-base font-medium tracking-tight">
              No dependencies
            </h3>
            {importerId ?
              <p className="text-muted-foreground w-4/5 text-sm font-normal tracking-normal">
                Your project's dependencies will appear here, install
                one to see it appear
              </p>
            : <p className="text-muted-foreground w-4/5 text-sm font-normal tracking-normal">
                This package has no installed dependencies
              </p>
            }
            {importerId && (
              <Popover
                open={dependencyPopoverOpen}
                onOpenChange={setDependencyPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    onClick={toggleAddDepPopover}
                    className="border-muted mt-2 h-8 w-fit rounded-xl border-[1px]">
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
                  className="top-0 right-0 w-96 p-0">
                  <AddDependenciesPopover />
                </PopoverContent>
              </Popover>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
