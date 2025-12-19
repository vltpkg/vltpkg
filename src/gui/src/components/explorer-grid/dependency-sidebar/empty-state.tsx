import { motion } from 'framer-motion'
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

  const importerId = useDependencySidebarStore(
    state => state.importerId,
  )

  return (
    <div className="flex min-h-96 w-full cursor-default flex-col items-center justify-center rounded-xl py-12">
      <div className="mb-6 flex justify-center">
        <div className="relative">
          <div className="relative space-y-2">
            <div className="border-background-secondary bg-background h-12 w-64 scale-[0.95] rotate-1 transform rounded-2xl border border-dashed" />
            <div className="border-background-secondary bg-background -mt-10 h-12 w-64 scale-[0.97] -rotate-1 transform rounded-2xl border border-dashed" />

            <div className="border-background-secondary bg-background relative z-10 -mt-10 flex h-12 w-64 scale-[0.99] items-center justify-between rounded-xl border border-dashed px-4">
              <div className="flex items-center gap-3">
                <div className="border-background-secondary bg-background-secondary border-px h-4 w-12 rounded-2xl border-dashed" />
                <div className="border-background-secondary bg-background-secondary border-px h-4 w-28 rounded-2xl border-dashed" />
              </div>
              <div className="border-background-secondary bg-background-secondary border-px h-4 w-10 rounded-2xl border-dashed" />
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
            Your project's dependencies will appear here, install one
            to see it appear
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
                className="border-muted border-px mt-2 h-8 w-fit rounded-xl">
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
    </div>
  )
}
