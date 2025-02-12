import { type SyntheticEvent, useState } from 'react'
import { useGraphStore } from '@/state/index.js'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Label } from '@/components/ui/form-label.jsx'
import { Card } from '@/components/ui/card.jsx'
import { requestRouteTransition } from '@/lib/request-route-transition.js'

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
    <div className="flex grow flex-col bg-secondary px-8 py-8 dark:bg-black">
      <Card className="container mx-auto w-full px-8 py-8 lg:w-[1024px]">
        <h1 className="mb-2 text-3xl font-bold">
          Create a new project
        </h1>
        <p className="mb-6 text-gray-600">
          A project is represented by a folder containing a
          package.json file.
        </p>

        <form className="space-y-6" onSubmit={formSubmit}>
          <div className="flex space-x-4">
            <div className="w-1/2">
              <Label htmlFor="location">Location *</Label>
              <Select
                defaultValue={pathName}
                onValueChange={setPathName}>
                <SelectTrigger id="location">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {dashboard?.dashboardProjectLocations.map(
                    location => (
                      <SelectItem
                        key={location.path}
                        value={location.path}>
                        {location.readablePath}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="w-1/2">
              <Label htmlFor="projectName">Project Name *</Label>
              <Input
                id="projectName"
                value={projectName}
                onChange={handleProjectNameChange}
                className={
                  !isProjectNameValid ? 'border-red-500' : ''
                }
              />
              {!isProjectNameValid && (
                <p className="mt-1 text-sm text-red-500">
                  Project name can only contain lowercase letters and
                  hyphens
                </p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="author">Author</Label>
            <Input
              id="author"
              value={authorName}
              onChange={handleAuthorNameChange}
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit">Create New Project</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
