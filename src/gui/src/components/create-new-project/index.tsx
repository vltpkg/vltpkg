import { type SyntheticEvent, useState } from 'react'
import { useGraphStore } from '@/state/index.js'
import { Input } from '@/components/ui/input.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Label } from '@/components/ui/form-label.jsx'
import { requestRouteTransition } from '@/lib/request-route-transition.js'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command.jsx'
import { ChevronDown, Check } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover.jsx'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils.js'

export type NewProjectItem = {
  path: string
  name: string
  author: string
}

export const CreateNewProjectContent = () => {
  const dashboard = useGraphStore(state => state.dashboard)
  const updateActiveRoute = useGraphStore(
    state => state.updateActiveRoute,
  )
  const updateErrorCause = useGraphStore(
    state => state.updateErrorCause,
  )
  const updateQuery = useGraphStore(state => state.updateQuery)
  const updateStamp = useGraphStore(state => state.updateStamp)

  const [pathName, setPathName] = useState('')
  const [projectName, setProjectName] = useState('')
  const [authorName, setAuthorName] = useState(
    dashboard?.defaultAuthor ?? '',
  )
  const [isProjectNameValid, setIsProjectNameValid] = useState(true)

  const validateProjectName = (name: string) => {
    const regex = /^[a-z0-9-]+$/
    return regex.test(name) && name.length < 128
  }

  const handleProjectNameChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const name = e.target.value
    setProjectName(name)
    setIsProjectNameValid(validateProjectName(name))
  }

  const handleAuthorNameChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setAuthorName(e.target.value)
  }

  const formSubmit = (e: SyntheticEvent) => {
    e.stopPropagation()
    e.preventDefault()
    void requestRouteTransition<NewProjectItem>({
      updateActiveRoute,
      updateErrorCause,
      updateQuery,
      updateStamp,
      body: {
        path: pathName,
        name: projectName,
        author: authorName,
      },
      url: '/create-project',
      destinationRoute: '/explore',
      errorMessage: 'Failed to create project.',
    })
  }

  return (
    <div className="z-[3] flex w-full flex-col rounded-md border-[1px] border-dashed bg-card/50">
      <div className="flex flex-col gap-2 px-8 py-8">
        <h5 className="text-xl font-medium">Project details</h5>
        <p className="text-sm italic text-muted-foreground/50">
          Required fields are marked with an asterisk (*).
        </p>
      </div>

      <form className="space-y-6" onSubmit={formSubmit}>
        <div className="flex w-1/2 flex-col gap-2 px-8">
          <Label htmlFor="projectName">Project Name *</Label>
          <Input
            id="projectName"
            value={projectName}
            placeholder="vlt-project"
            onChange={handleProjectNameChange}
            className={!isProjectNameValid ? 'border-red-500' : ''}
          />
          <AnimatePresence>
            {!isProjectNameValid && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{
                  duration: 0.2,
                  ease: [0.45, 0, 0.55, 1],
                }}
                animate={{ height: 'auto', opacity: 1 }}>
                <p
                  className="text-sm text-red-500"
                  style={{ marginTop: !isProjectNameValid ? 10 : 0 }}>
                  Project name can only contain lowercase letters and
                  hyphens
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <motion.div
          animate={{ top: !isProjectNameValid ? 10 : 0 }}
          layout
          initial={{ top: 0 }}
          transition={{
            duration: 0.2,
            ease: [0.45, 0, 0.55, 1],
          }}
          className="flex w-1/2 flex-col gap-6 px-8">
          <div className="flex flex-col gap-2">
            <Label htmlFor="location">Location *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button className="group flex h-[40px] w-full items-center justify-between border-[1px] border-border bg-background text-muted-foreground shadow-none transition-all duration-300 hover:bg-muted-foreground/20">
                  {pathName || '~'}
                  <ChevronDown className="text-foreground opacity-50 transition-all duration-300 group-data-[state=open]:-rotate-180" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="max-h-[--radix-popover-content-available-height] w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput placeholder="Select location" />
                  <CommandList>
                    <CommandEmpty>Location not found.</CommandEmpty>
                    <CommandGroup>
                      {dashboard?.dashboardProjectLocations.map(
                        location => (
                          <CommandItem
                            key={location.path}
                            value={location.path}
                            className="cursor-pointer"
                            onSelect={currentValue => {
                              setPathName(
                                currentValue === pathName ? '' : (
                                  currentValue
                                ),
                              )
                            }}>
                            <Check
                              className={cn(
                                'mr-2 size-4',
                                pathName === location.path ?
                                  'opacity-100'
                                : 'opacity-0',
                              )}
                            />
                            {location.readablePath}
                          </CommandItem>
                        ),
                      )}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="author">Author</Label>
            <Input
              placeholder="John Doe <johndoe@acme.com>"
              id="author"
              value={authorName}
              onChange={handleAuthorNameChange}
            />
          </div>
        </motion.div>

        <div className="flex justify-end border-t-[1px] border-dashed px-4 py-4">
          <Button
            className="font-medium"
            disabled={
              !isProjectNameValid ||
              projectName.trim() === '' ||
              pathName.trim() === ''
            }
            type="submit">
            Create Project
          </Button>
        </div>
      </form>
    </div>
  )
}
