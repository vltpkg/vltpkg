import { useState } from 'react'
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover.jsx'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command.jsx'
import { Button } from '@/components/ui/button.jsx'
import { ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils.js'
import type { DashboardData } from '@/state/types.js'

interface DirectorySelectProps {
  directory: string
  setDirectory: (directory: string) => void
  dashboard?: DashboardData
  acceptsGlobal?: boolean
}

export const DirectorySelect = ({
  directory,
  setDirectory,
  dashboard,
  acceptsGlobal = true,
}: DirectorySelectProps) => {
  const [displayPath, setDisplayPath] = useState<string>(
    acceptsGlobal ? 'Global' : '',
  )

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button className="group flex h-[40px] w-full items-center justify-between border-[1px] border-muted bg-white text-muted-foreground shadow-none hover:bg-accent dark:bg-muted-foreground/5 dark:hover:bg-muted-foreground/10">
          {displayPath || 'Select a directory'}
          <ChevronDown className="text-foreground opacity-50 duration-300 group-data-[state=open]:-rotate-180" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="max-h-[--radix-popover-content-available-height] w-[--radix-popover-trigger-width] p-0">
        <Command defaultValue={acceptsGlobal ? '' : undefined}>
          <CommandInput placeholder="Directory" />
          <CommandList>
            <CommandEmpty>Directory not found.</CommandEmpty>
            <CommandGroup>
              {dashboard?.dashboardProjectLocations.map(location =>
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
