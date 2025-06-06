import { useState } from 'react'
import {
  Plus,
  BatteryLow,
  PackageCheck,
  PackagePlus,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button.tsx'
import { CardHeader, CardTitle } from '@/components/ui/card.tsx'
import { Input } from '@/components/ui/input.tsx'
import { Label } from '@/components/ui/form-label.tsx'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  TooltipPortal,
} from '@/components/ui/tooltip.tsx'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover.tsx'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx'
import { LoadingSpinner } from '@/components/ui/loading-spinner.tsx'
import {
  useDependencySidebarStore,
  usePopover,
  useOperation,
} from '@/components/explorer-grid/dependency-sidebar/context.tsx'

import type {
  ChangeEvent,
  SyntheticEvent,
  KeyboardEvent,
  MouseEvent,
} from 'react'

export const AddDependenciesPopover = () => {
  const [packageName, setPackageName] = useState<string>('')
  const [packageVersion, setPackageVersion] =
    useState<string>('latest')
  const [packageType, setPackageType] = useState<string>('prod')

  const inProgress = useDependencySidebarStore(
    state => state.inProgress,
  )
  const error = useDependencySidebarStore(state => state.error)
  const { operation } = useOperation()
  const { setDependencyPopoverOpen } = usePopover()

  // we need to add this extra event handler in order to avoid
  // radix-ui/popover from closing the popup on pressing enter
  const keyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      formSubmit(e)
    }
  }

  const formSubmit = (e: SyntheticEvent) => {
    e.stopPropagation()
    e.preventDefault()
    void operation({
      item: {
        name: packageName,
        version: packageVersion,
        type: packageType,
      },
      operationType: 'install',
    })
  }

  const closePopover = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDependencyPopoverOpen(false)
  }

  if (inProgress) {
    return (
      <>
        <CardHeader className="relative flex w-full flex-col rounded-t-lg p-0">
          <div className="flex items-center justify-between px-6 py-4">
            <CardTitle className="flex items-center text-lg font-medium">
              <PackagePlus size={18} className="mr-2" />
              Add new dependency
            </CardTitle>
          </div>
        </CardHeader>
        <div className="flex h-48 items-center justify-center">
          <LoadingSpinner />
        </div>
      </>
    )
  }

  if (error) {
    return (
      <>
        <CardHeader className="relative flex w-full flex-col rounded-t-lg p-0">
          <div className="flex items-center justify-between px-6 py-4">
            <CardTitle className="flex items-center text-lg font-medium">
              <BatteryLow size={18} className="mr-2" />
              Error
            </CardTitle>
          </div>
        </CardHeader>
        <div className="flex flex-row flex-wrap items-center justify-between gap-2 border-t-[1px] border-muted-foreground/20 p-6">
          <p className="text-sm">{error}</p>
        </div>
        <div className="flex w-full justify-end">
          <Button
            className="m-2"
            role="cancel"
            variant="secondary"
            tabIndex={4}
            onClick={closePopover}>
            Close
          </Button>
        </div>
      </>
    )
  }

  return (
    <>
      <CardHeader className="relative flex w-full flex-col rounded-t-lg p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <CardTitle className="flex items-center text-lg font-medium">
            <PackagePlus size={18} className="mr-2" />
            Add new dependency
          </CardTitle>
        </div>
      </CardHeader>
      <form
        className="flex flex-row flex-wrap items-center justify-between gap-2 border-t-[1px] border-muted-foreground/20 p-6"
        onSubmit={formSubmit}
        onKeyDown={keyDown}>
        <Label htmlFor="package-name" className="ml-1">
          Package Name
        </Label>
        <Input
          id="package-name"
          tabIndex={1}
          type="text"
          role="input"
          placeholder="Package name"
          value={packageName}
          onChange={(e: ChangeEvent) => {
            const value = (e.currentTarget as HTMLInputElement).value
            setPackageName(value)
          }}
        />
        <Label htmlFor="package-version" className="ml-1 mt-2">
          Version | Spec
        </Label>
        <Input
          id="package-version"
          tabIndex={2}
          type="text"
          role="input"
          value={packageVersion}
          onChange={(e: ChangeEvent) => {
            const value = (e.currentTarget as HTMLInputElement).value
            setPackageVersion(value)
          }}
        />
        <Label htmlFor="package-type" className="ml-1 mt-2">
          Type
        </Label>
        <Select
          defaultValue={packageType}
          onValueChange={setPackageType}>
          <SelectTrigger className="cursor-default">
            <SelectValue tabIndex={3} />
          </SelectTrigger>
          <SelectContent className="z-[10001]">
            <SelectItem value="prod">dependencies</SelectItem>
            <SelectItem value="dev">devDependencies</SelectItem>
            <SelectItem value="optional">
              optionalDependencies
            </SelectItem>
            <SelectItem value="peer">peerDependencies</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex w-full justify-end">
          <Button
            className="mr-2 mt-2"
            role="cancel"
            variant="secondary"
            tabIndex={4}
            onClick={closePopover}>
            Cancel
          </Button>
          <Button className="mt-2" role="submit" tabIndex={5}>
            <PackageCheck size={16} />
            Install package
          </Button>
        </div>
      </form>
    </>
  )
}

export const AddDependenciesPopoverTrigger = () => {
  const {
    toggleAddDepPopover,
    dependencyPopoverOpen,
    setDependencyPopoverOpen,
  } = usePopover()

  return (
    <TooltipProvider>
      <Popover
        onOpenChange={setDependencyPopoverOpen}
        open={dependencyPopoverOpen}>
        <PopoverTrigger>
          <Tooltip delayDuration={150}>
            <TooltipTrigger asChild>
              <div
                onClick={toggleAddDepPopover}
                className="inline-flex size-6 cursor-default items-center justify-center gap-2 whitespace-nowrap rounded-md border border-input bg-white text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 dark:bg-black [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0">
                <motion.span
                  animate={{
                    rotate: dependencyPopoverOpen ? 45 : 0,
                  }}>
                  <Plus />
                </motion.span>
              </div>
            </TooltipTrigger>
            <TooltipPortal>
              <TooltipContent>Add a new dependency</TooltipContent>
            </TooltipPortal>
          </Tooltip>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="right-0 top-0 w-96 p-0"
          onCloseAutoFocus={e => e.preventDefault()}>
          <AddDependenciesPopover />
        </PopoverContent>
      </Popover>
    </TooltipProvider>
  )
}
