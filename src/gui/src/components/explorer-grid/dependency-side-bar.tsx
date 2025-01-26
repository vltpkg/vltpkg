import { useEffect, useState } from 'react'
import { GitFork, Plus } from 'lucide-react'
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
import {
  AddDependenciesPopover,
  type InstallOptions,
} from '@/components/explorer-grid/add-dependencies-popover.jsx'
import { useToast } from '@/components/hooks/use-toast.js'
import { type Action } from '@/state/types.js'
import { useGraphStore } from '@/state/index.js'
import { useAnimate } from 'framer-motion'

type ChangePackageOptions = {
  operation: 'install' | 'uninstall'
  setError: (str: string) => void
  setInProgress: (bool: boolean) => void
  updateStamp: Action['updateStamp']
  toast: ReturnType<typeof useToast>['toast']
  name: string
  version?: string
  type?: string
  importerId: DepID
  onSuccessful?: (str: string) => void
}

const changePackage = async ({
  operation,
  setError,
  setInProgress,
  updateStamp,
  toast,
  importerId,
  name,
  version,
  type,
  onSuccessful,
}: ChangePackageOptions) => {
  const body =
    operation === 'install' ?
      {
        add: {
          [importerId]: {
            [name]: {
              version,
              type,
            },
          },
        },
      }
    : {
        remove: {
          [importerId]: [name],
        },
      }
  let req
  try {
    setInProgress(true)
    req = await fetch(`/${operation}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
  } catch (err) {
    console.error(err)
    setError(String(err))
    return
  } finally {
    setInProgress(false)
  }

  let installed = false
  let res = ''
  try {
    res = (await req.json()) as string
    installed = res === 'ok'
  } catch (err) {
    console.warn('unable to parse json response:', err)
  }

  if (installed) {
    toast({
      description: `Successfully ${operation}ed: ${name}`,
    })
    onSuccessful?.(name)
    updateStamp()
  } else {
    if ((req.status === 500 || req.status === 400) && res) {
      setError(res)
    }
    if (!res) {
      setError('Failed to install dependency.')
    }
  }
}

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
  const [scope, animate] = useAnimate()
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
  const [showAddDepPopover, setShowAddDepPopover] = useState(false)
  const [addedDependencies, setAddedDependencies] = useState<
    string[]
  >([])

  useEffect(() => {
    if (scope.current) {
      if (showAddDepPopover) {
        animate(scope.current, {
          rotate: -45,
        })
      } else {
        animate(scope.current, {
          rotate: 0,
        })
      }
    }
  }, [showAddDepPopover, scope])

  const toggleShowAddDepPopover = () => {
    // if there is an error, clear it when opening the popover
    if (showAddDepPopover && error) {
      setError('')
      setInProgress(false)
    }
    setShowAddDepPopover(!showAddDepPopover)
  }
  const onSuccessfulInstall = (name: string) => {
    toggleShowAddDepPopover()
    setAddedDependencies([name, ...addedDependencies])
  }
  const onSuccessfulUninstall = (name: string) => {
    setAddedDependencies(
      [...addedDependencies].filter(item => item !== name),
    )
  }
  const onInstall = ({ name, version, type }: InstallOptions) => {
    if (!importerId) {
      return
    }

    changePackage({
      operation: 'install',
      setError,
      setInProgress,
      updateStamp,
      toast,
      importerId,
      name,
      version,
      type,
      onSuccessful: onSuccessfulInstall,
    }).catch((err: unknown) => {
      console.error(err)
      updateActiveRoute('/error')
      updateErrorCause(
        'Unexpected error trying to install dependency.',
      )
    })
  }

  const onUninstall = (item: GridItemData) => {
    if (!importerId) {
      return
    }

    changePackage({
      operation: 'uninstall',
      setError,
      setInProgress,
      updateStamp,
      toast,
      importerId,
      name: item.name,
      onSuccessful: onSuccessfulUninstall,
    }).catch((err: unknown) => {
      console.error(err)
      updateActiveRoute('/error')
      updateErrorCause(
        'Unexpected error trying to uninstall dependency.',
      )
    })
  }

  return (
    <>
      <GridHeader>
        <GitFork size={22} className="mr-3 rotate-180" />
        Dependencies
        {importerId ?
          <div className="flex grow justify-end">
            <TooltipProvider>
              <Popover
                onOpenChange={setShowAddDepPopover}
                open={showAddDepPopover}>
                <PopoverTrigger>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        role="button"
                        variant="outline"
                        size="xs"
                        onClick={toggleShowAddDepPopover}>
                        <Plus ref={scope} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Add a new dependency</p>
                    </TooltipContent>
                  </Tooltip>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  className="right-0 top-0 w-96 p-0">
                  <AddDependenciesPopover
                    error={error}
                    inProgress={inProgress}
                    onInstall={onInstall}
                    onClose={toggleShowAddDepPopover}
                  />
                </PopoverContent>
              </Popover>
            </TooltipProvider>
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
          onSelect={onDependencyClick(item)}
          onUninstall={onUninstall}
        />
      ))}
    </>
  )
}
