import { useLayoutEffect, useRef, useState } from 'react'
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover.tsx'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command.tsx'
import { Button } from '@/components/ui/button.tsx'
import { ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils.ts'
import type { DashboardData } from '@/state/types.ts'

interface DirectorySelectProps {
  directory: string
  setDirectory: (directory: string) => void
  dashboard?: DashboardData
  acceptsGlobal?: boolean
  useDashboardProjectLocations?: boolean
  className?: string
}

export const DirectorySelect = ({
  directory,
  setDirectory,
  dashboard,
  acceptsGlobal = true,
  useDashboardProjectLocations = false,
  className,
}: DirectorySelectProps) => {
  const [displayPath, setDisplayPath] = useState<string>('')
  const mounted = useRef<boolean>(false)

  const directoryLocations =
    useDashboardProjectLocations ?
      dashboard?.dashboardProjectLocations
    : dashboard?.projects

  /**
   * The use a ref is to ensure that the initial display path is only set once.
   * This is because react will run useEffects twice in development mode.
   *
   * It is a useLayoutEffect to prevent layout shift on initial mount,
   * as it will run before initial paint.
   */
  useLayoutEffect(() => {
    const setInitialDisplayPath = () => {
      // query saved item case
      if (
        acceptsGlobal &&
        directory !== '' &&
        !useDashboardProjectLocations
      ) {
        setDisplayPath(
          directoryLocations?.find(
            location => location.path === directory,
          )?.readablePath ?? '',
        )
      }

      // query creation case
      else if (
        acceptsGlobal &&
        directory === '' &&
        !useDashboardProjectLocations
      ) {
        setDisplayPath('Global')
      }

      // creating a new project case
      else if (
        !acceptsGlobal &&
        useDashboardProjectLocations &&
        directory === ''
      ) {
        setDisplayPath('Select a directory')
      }
    }

    if (mounted.current) return
    mounted.current = true

    setInitialDisplayPath()
  }, [
    acceptsGlobal,
    directory,
    directoryLocations,
    useDashboardProjectLocations,
  ])

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          className={cn(
            'group flex h-[40px] w-full items-center justify-between border-[1px] border-muted bg-white text-muted-foreground shadow-none hover:bg-accent dark:bg-muted-foreground/5 dark:hover:bg-muted-foreground/10',
            className,
          )}>
          {displayPath}
          <ChevronDown className="text-foreground opacity-50 duration-300 group-data-[state=open]:-rotate-180" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="max-h-[--radix-popover-content-available-height] w-[--radix-popover-trigger-width] p-0">
        <Command defaultValue={acceptsGlobal ? '' : undefined}>
          <CommandInput placeholder="Directory" />
          <CommandList>
            <CommandEmpty>Directory not found.</CommandEmpty>
            <CommandGroup>
              {directoryLocations?.map(location =>
                location.readablePath === '~' && acceptsGlobal ?
                  <CommandItem
                    key={location.path}
                    value=""
                    className="hover:bg-accent"
                    onSelect={currentValue => {
                      setDirectory(currentValue === '' ? '' : '')
                      setDisplayPath('Global')
                    }}>
                    <Check
                      className={cn(
                        'mr-2 size-4',
                        directory === '' ? 'opacity-100' : (
                          'opacity-0'
                        ),
                      )}
                    />
                    Global
                  </CommandItem>
                : <CommandItem
                    key={location.path}
                    value={location.path}
                    onSelect={currentValue => {
                      setDirectory(
                        currentValue === directory ? '' : (
                          currentValue
                        ),
                      )
                      setDisplayPath(
                        acceptsGlobal && currentValue === directory ?
                          'Global'
                        : location.readablePath,
                      )
                    }}>
                    <Check
                      className={cn(
                        'mr-2 size-4',
                        directory === location.path ?
                          'opacity-100'
                        : 'opacity-0',
                      )}
                    />
                    {location.readablePath}
                  </CommandItem>,
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
