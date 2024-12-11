import { type ChangeEvent, useState } from 'react'
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
import { PopoverClose } from '@/components/ui/popover.jsx'
import { LoadingSpinner } from '@/components/ui/loading-spinner.jsx'
import { type Action } from '@/state/types.js'
import { useGraphStore } from '@/state/index.js'
import { useToast } from '@/components/hooks/use-toast.js'

type ManageDependenciesProps = {
  importerId: string
  onSuccessfulInstall: (str: string) => void
}

type InstallPackageOptions = {
  setError: (str: string) => void
  setInProgress: (bool: boolean) => void
  updateStamp: Action['updateStamp']
  toast: ReturnType<typeof useToast>['toast']
  name: string
  version: string
  type: string
  importerId: string
  onSuccessfulInstall: ManageDependenciesProps['onSuccessfulInstall']
}

const installPackage = async ({
  setError,
  setInProgress,
  updateStamp,
  toast,
  importerId,
  name,
  version,
  type,
  onSuccessfulInstall,
}: InstallPackageOptions) => {
  let req
  try {
    setInProgress(true)
    req = await fetch('/install', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        add: {
          [importerId]: {
            [name]: {
              version,
              type,
            },
          },
        },
      }),
    })
  } catch (err) {
    console.error(err)
    setError(String(err))
    return
  } finally {
    setInProgress(false)
  }

  let installed = false
  try {
    installed = (await req.json()) === 'ok'
  } catch (err) {
    console.error(err)
  }

  if (installed) {
    toast({
      description: `Successfully installed: ${name}`,
    })
    onSuccessfulInstall(name)
    updateStamp()
  } else {
    setError('Failed to install dependency.')
  }
}

export const ManageDependencies = ({
  importerId,
  onSuccessfulInstall,
}: ManageDependenciesProps) => {
  const { toast } = useToast()
  const updateStamp = useGraphStore(state => state.updateStamp)
  const updateActiveRoute = useGraphStore(
    state => state.updateActiveRoute,
  )
  const updateErrorCause = useGraphStore(
    state => state.updateErrorCause,
  )
  const [error, setError] = useState<string>('')
  const [inProgress, setInProgress] = useState<boolean>(false)
  const [packageName, setPackageName] = useState<string>('')
  const [packageVersion, setPackageVersion] =
    useState<string>('latest')
  const [packageType, setPackageType] = useState<string>('prod')
  const onInstall = () => {
    installPackage({
      setError,
      setInProgress,
      updateStamp,
      toast,
      importerId,
      name: packageName,
      version: packageVersion,
      type: packageType,
      onSuccessfulInstall,
    }).catch((err: unknown) => {
      console.error(err)
      updateActiveRoute('/error')
      updateErrorCause(
        'Unexpected error trying to install dependency.',
      )
    })
  }

  if (inProgress) {
    return (
      <>
        <CardHeader className="rounded-t-lg relative flex flex-col w-full p-0">
          <div className="flex items-center justify-between px-6 py-4">
            <CardTitle className="text-lg font-medium flex items-center">
              <PackagePlus size={18} className="mr-2" />
              Add new dependency
            </CardTitle>
          </div>
        </CardHeader>
        <div className="flex justify-center items-center h-48">
          <LoadingSpinner />
        </div>
      </>
    )
  }

  if (error) {
    return (
      <>
        <CardHeader className="rounded-t-lg relative flex flex-col w-full p-0">
          <div className="flex items-center justify-between px-6 py-4">
            <CardTitle className="text-lg font-medium flex items-center">
              <BatteryLow size={18} className="mr-2" />
              Error
            </CardTitle>
          </div>
        </CardHeader>
        <div className="flex items-center flex-row justify-between gap-2 flex-wrap p-6 border-muted-foreground/20 border-t-[1px]">
          <p className="text-sm">{error}</p>
        </div>
        <div className="flex justify-end w-full">
          <PopoverClose>
            <Button
              className="m-2"
              role="cancel"
              variant="secondary"
              tabIndex={4}>
              Close
            </Button>
          </PopoverClose>
        </div>
      </>
    )
  }

  return (
    <>
      <CardHeader className="rounded-t-lg relative flex flex-col w-full p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <CardTitle className="text-lg font-medium flex items-center">
            <PackagePlus size={18} className="mr-2" />
            Add new dependency
          </CardTitle>
        </div>
      </CardHeader>
      <div className="flex items-center flex-row justify-between gap-2 flex-wrap p-6 border-muted-foreground/20 border-t-[1px]">
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
          <SelectContent>
            <SelectItem value="prod">dependencies</SelectItem>
            <SelectItem value="dev">devDependencies</SelectItem>
            <SelectItem value="optional">
              optionalDependencies
            </SelectItem>
            <SelectItem value="peer">peerDependencies</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex justify-end w-full">
          <PopoverClose>
            <Button
              className="mt-2 mr-2"
              role="cancel"
              variant="secondary"
              tabIndex={4}>
              Cancel
            </Button>
          </PopoverClose>
          <Button
            className="mt-2"
            role="submit"
            tabIndex={5}
            onClick={onInstall}>
            <PackageCheck size={16} />
            Install package
          </Button>
        </div>
      </div>
    </>
  )
}
