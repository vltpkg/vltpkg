import { useState, useEffect } from 'react'
import { useGraphStore } from '@/state/index.js'
import { CreateNewProjectContent } from '@/components/create-new-project/index.jsx'
import { startDashboardData } from '@/lib/start-dashboard-data.js'
import { InlineCode } from '@/components/ui/inline-code.jsx'
import { LoadingSpinner } from '@/components/ui/loading-spinner.jsx'

export const CreateNewProject = () => {
  const updateActiveRoute = useGraphStore(
    state => state.updateActiveRoute,
  )
  const updateDashboard = useGraphStore(
    state => state.updateDashboard,
  )
  const updateErrorCause = useGraphStore(
    state => state.updateErrorCause,
  )
  const stamp = useGraphStore(state => state.stamp)

  const [inProgress, setInProgress] = useState<boolean>(false)

  useEffect(() => {
    startDashboardData({
      updateActiveRoute,
      updateDashboard,
      updateErrorCause,
      stamp,
    })

    history.pushState(
      { query: '', route: '/new-project' },
      '',
      '/new-project',
    )
    window.scrollTo(0, 0)
  }, [stamp])

  if (inProgress)
    return (
      <section className="flex h-full w-full grow items-center justify-center">
        <LoadingSpinner />
      </section>
    )

  return (
    <section className="flex h-full w-full flex-col rounded-lg border-[1px]">
      <div className="h-1/5 rounded-t-lg border-b-[1px] border-border">
        <div className="mx-auto flex h-full max-w-8xl flex-col justify-end gap-2 px-16 py-8">
          <h4 className="text-2xl font-medium">
            Create a new Project
          </h4>
          <p className="text-pretty text-sm text-muted-foreground">
            A Project is a scaffolded through the{' '}
            <InlineCode>vlt init</InlineCode> command, and creates a
            folder that contains a{' '}
            <InlineCode>package.json</InlineCode> file.
          </p>
        </div>
      </div>
      <div className="relative mx-auto flex h-full w-full max-w-8xl items-center justify-center px-16 py-8">
        <div className="absolute inset-0 z-[1] bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#fff_70%,transparent_100%)] dark:[mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_60%,transparent_100%)]" />
        <CreateNewProjectContent
          inProgress={inProgress}
          setInProgress={setInProgress}
        />
      </div>
    </section>
  )
}
