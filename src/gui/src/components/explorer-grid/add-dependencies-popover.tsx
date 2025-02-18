import {
  type ChangeEvent,
  useState,
  type SyntheticEvent,
  type KeyboardEvent,
  type MouseEvent,
} from 'react'
import { BatteryLow, PackageCheck, PackagePlus } from 'lucide-react'
import { Button } from '@/components/ui/button.jsx'
import { CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/form-label.jsx'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.jsx'
import { LoadingSpinner } from '@/components/ui/loading-spinner.jsx'

export type InstallOptions = {
  name: string
  version: string
  type: string
}

export type AddDependenciesPopoverProps = {
  error: string
  inProgress: boolean
  onInstall: (o: InstallOptions) => void
  onClose: () => void
}

export const AddDependenciesPopover = ({
  error,
  inProgress,
  onInstall,
  onClose,
}: AddDependenciesPopoverProps) => {
  const [packageName, setPackageName] = useState<string>('')
  const [packageVersion, setPackageVersion] =
    useState<string>('latest')
  const [packageType, setPackageType] = useState<string>('prod')
  const formSubmit = (e: SyntheticEvent) => {
    e.stopPropagation()
    e.preventDefault()
    onInstall({
      name: packageName,
      version: packageVersion,
      type: packageType,
    })
  }
  // we need to add this extra event handler in order to avoid
  // radix-ui/popover from closing the popup on pressing enter
  const keyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      formSubmit(e)
    }
  }

  const closePopover = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onClose()
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
          <SelectTrigger>
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
