import { useNavigate } from 'react-router'
import { useState, useRef } from 'react'
import type { SyntheticEvent } from 'react'
import { useGraphStore } from '@/state/index.ts'
import { Input } from '@/components/ui/input.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Label } from '@/components/ui/form-label.tsx'
import { requestRouteTransition } from '@/lib/request-route-transition.ts'
import { motion, AnimatePresence } from 'framer-motion'
import { Grid, System, Cell } from '@/components/grid/grid.tsx'
import { Next, Vercel, Nuxt, Node } from '@/components/icons/index.ts'
import { AnimatedBeam } from '@/components/animated-beam.tsx'
import { DirectorySelect } from '@/components/directory-select.tsx'

export type NewProjectItem = {
  path: string
  name: string
  author: string
}

interface CreateNewProjectContentProps {
  inProgress: boolean
  setInProgress: (inProgress: boolean) => void
}

export const CreateNewProjectContent = ({
  inProgress,
  setInProgress,
}: CreateNewProjectContentProps) => {
  const navigate = useNavigate()
  const dashboard = useGraphStore(state => state.dashboard)
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

  const containerRef = useRef<HTMLDivElement>(null)
  const nextRef = useRef<HTMLDivElement>(null)
  const vltRef = useRef<HTMLDivElement>(null)
  const nodeRef = useRef<HTMLDivElement>(null)
  const nuxtRef = useRef<HTMLDivElement>(null)
  const vercelRef = useRef<HTMLDivElement>(null)

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
    if (inProgress) return
    setInProgress(true)
    void requestRouteTransition<NewProjectItem>({
      navigate,
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
    <div className="z-[3] flex w-full rounded-md border-[1px] border-dashed bg-card">
      <form
        className="relative w-1/2 space-y-6 border-r-[1px] border-solid border-dashed"
        onSubmit={formSubmit}>
        <div className="mb-12 flex flex-col gap-2 px-8 pt-8">
          <h5 className="text-xl font-medium">Project details</h5>
          <p className="text-sm italic text-muted-foreground/50">
            Required fields are marked with an asterisk (*).
          </p>
        </div>
        <div className="flex flex-col gap-2 px-8">
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
                  style={{ marginTop: 10 }}>
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
          className="flex flex-col gap-6">
          <div className="flex flex-col gap-2 px-8">
            <Label htmlFor="location">Location *</Label>
            <DirectorySelect
              useDashboardProjectLocations
              acceptsGlobal={false}
              dashboard={dashboard}
              setDirectory={setPathName}
              directory={pathName}
            />
          </div>

          <div className="flex flex-col gap-2 px-8">
            <Label htmlFor="author">Author</Label>
            <Input
              placeholder="John Doe <johndoe@acme.com>"
              id="author"
              value={authorName}
              onChange={handleAuthorNameChange}
            />
          </div>
        </motion.div>

        <div className="absolute bottom-0 flex w-full justify-end border-t-[1px] border-dashed px-8 py-4">
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

      <div className="relative h-full w-1/2">
        <div className="absolute inset-0 z-[10] h-full w-full bg-gradient-radial from-card/20 to-card/80" />
        <System className="h-full w-full">
          <Grid rows={7} columns={7} ref={containerRef}>
            <Cell column={2} row={2} ref={nextRef}>
              <div className="/80 relative z-[2] flex h-full w-full items-center justify-center border-b-[1px] border-r-[1px] border-dashed border-muted bg-card">
                <div className="flex items-center justify-center shadow-inner">
                  <Next className="size-12 text-muted-foreground/80" />
                </div>
              </div>
            </Cell>

            <Cell column={6} row={2} ref={nuxtRef}>
              <div className="/80 relative z-[2] flex h-full w-full items-center justify-center border-b-[1px] border-r-[1px] border-dashed border-muted bg-card">
                <div className="flex items-center justify-center shadow-inner">
                  <Nuxt className="size-12 text-muted-foreground/80" />
                </div>
              </div>
            </Cell>

            <Cell column={2} row={6} ref={vercelRef}>
              <div className="/80 relative z-[2] flex h-full w-full items-center justify-center border-b-[1px] border-r-[1px] border-dashed border-muted bg-card">
                <div className="flex items-center justify-center shadow-inner">
                  <Vercel className="size-12 text-muted-foreground/80" />
                </div>
              </div>
            </Cell>

            <Cell column={6} row={6} ref={nodeRef}>
              <div className="/80 relative z-[2] flex h-full w-full items-center justify-center border-b-[1px] border-r-[1px] border-dashed border-muted bg-card">
                <div className="flex h-full w-full items-center justify-center shadow-inner">
                  <Node className="size-12 fill-muted-foreground/80" />
                </div>
              </div>
            </Cell>

            <Cell column={4} row={4} ref={vltRef}>
              <div className="relative z-[2] flex h-full w-full items-center justify-center border-b-[1px] border-r-[1px] border-dashed border-muted bg-card p-2 shadow-inner">
                <div className="flex items-center justify-center">
                  <svg
                    width="24"
                    className="size-16 text-muted-foreground"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg">
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M6.54545 17.4601C6.54545 20.4686 8.9945 22.9201 12 22.9201C15.0055 22.9201 17.4545 20.4686 17.4545 17.4601C17.4545 16.6302 17.2691 15.8275 16.9145 15.0959L18.7745 11.9947C21.6764 11.8745 24 9.54858 24 6.54008C24 3.53157 21.551 1.08008 18.5455 1.08008C15.54 1.08008 13.0909 3.53157 13.0909 6.54008C13.0909 7.37 13.2764 8.17266 13.631 8.90421L12 11.6234L10.369 8.90421C10.7236 8.17808 10.9091 7.37 10.9091 6.54008C10.9091 3.53157 8.46004 1.08008 5.45455 1.08008C2.44909 1.08008 0 3.6081 0 6.54008C0 9.47205 2.32364 11.8745 5.22545 11.9947L7.0855 15.0959C6.73091 15.8221 6.54545 16.6302 6.54545 17.4601ZM15.2727 6.54008C15.2727 4.73277 16.74 3.26408 18.5455 3.26408C20.351 3.26408 21.8182 4.73277 21.8182 6.54008C21.8182 8.34738 20.351 9.81608 18.5455 9.81608C18.2236 9.81608 17.9127 9.76698 17.6182 9.67962L14.3291 15.1615C14.9127 15.7566 15.2727 16.5646 15.2727 17.4601C15.2727 19.2674 13.8055 20.7361 12 20.7361C10.1945 20.7361 8.72727 19.2674 8.72727 17.4601C8.72727 16.5646 9.08727 15.7511 9.67087 15.1615L6.38182 9.67962C6.08727 9.76698 5.77641 9.81608 5.45455 9.81608C3.64905 9.81608 2.18182 8.34738 2.18182 6.54008C2.18182 4.73277 3.64905 3.26408 5.45455 3.26408C7.26004 3.26408 8.72727 4.73277 8.72727 6.54008C8.72727 7.43552 8.36727 8.24901 7.78368 8.83869L11.0727 14.3205C11.3673 14.2332 11.6781 14.1841 12 14.1841C12.3219 14.1841 12.6327 14.2332 12.9273 14.3205L16.2163 8.83869C15.6327 8.2436 15.2727 7.43552 15.2727 6.54008Z"
                      fill="currentColor"
                    />
                  </svg>
                </div>
              </div>
            </Cell>

            <AnimatedBeam
              containerRef={containerRef}
              fromRef={nextRef}
              delay={0.5}
              toRef={vltRef}
            />
            <AnimatedBeam
              containerRef={containerRef}
              fromRef={nuxtRef}
              delay={1}
              reverse={true}
              toRef={vltRef}
            />
            <AnimatedBeam
              containerRef={containerRef}
              fromRef={vercelRef}
              delay={1.5}
              toRef={vltRef}
            />

            <AnimatedBeam
              containerRef={containerRef}
              delay={2}
              reverse={true}
              fromRef={nodeRef}
              toRef={vltRef}
            />
          </Grid>
        </System>
      </div>
    </div>
  )
}
