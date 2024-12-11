import { useState } from 'react'
import { GitFork, PlusIcon, X } from 'lucide-react'
import { type DepID } from '@vltpkg/dep-id/browser'
import { Button } from '@/components/ui/button.jsx'
import { GridHeader } from '@/components/explorer-grid/header.jsx'
import { SideItem } from '@/components/explorer-grid/side-item.jsx'
import { type GridItemData } from '@/components/explorer-grid/types.js'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip.jsx'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover.jsx'
import { ManageDependencies } from '@/components/explorer-grid/manage-dependencies.jsx'

export type DependencySideBarProps = {
  dependencies: GridItemData[]
  importerId?: DepID
  onDependencyClick: (item: GridItemData) => () => undefined
}

export const DependencySideBar = ({
  dependencies,
  importerId,
  onDependencyClick,
}: DependencySideBarProps) => {
  const [showAddDepPopover, setShowAddDepPopover] = useState(false)
  const [addedDependencies, setAddedDependencies] = useState<
    string[]
  >([])
  const toggleShowAddDepPopover = () => {
    setShowAddDepPopover(!showAddDepPopover)
  }
  const onDependencyInstall = (name: string) => {
    toggleShowAddDepPopover()
    setAddedDependencies([name, ...addedDependencies])
  }
  return (
    <>
      <GridHeader>
        <GitFork size={22} className="mr-3 rotate-180" />
        Dependencies
        {importerId ?
          <div className="grow flex justify-end">
            <Popover
              open={showAddDepPopover}
              onOpenChange={toggleShowAddDepPopover}>
              <PopoverTrigger>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Button
                        role="button"
                        variant="outline"
                        size="xs">
                        {showAddDepPopover ?
                          <X size={16} />
                        : <PlusIcon size={16} />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Add a new dependency</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                className="p-0 w-96 top-0 right-0">
                <ManageDependencies
                  importerId={importerId}
                  onSuccessfulInstall={onDependencyInstall}
                />
              </PopoverContent>
            </Popover>
          </div>
        : ''}
      </GridHeader>
      {[
        ...dependencies
          .filter(item => addedDependencies.includes(item.name))
          .sort(
            (a, b) =>
              addedDependencies.indexOf(a.name) -
              addedDependencies.indexOf(b.name),
          ),
        ...dependencies
          .filter(item => !addedDependencies.includes(item.name))
          .sort((a, b) => a.name.localeCompare(b.name, 'en')),
      ].map((item, idx) => (
        <SideItem
          item={item}
          idx={idx}
          key={item.id}
          dependencies={true}
          onClick={onDependencyClick(item)}
        />
      ))}
    </>
  )
}
