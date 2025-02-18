import { useEffect } from 'react'
import { useGraphStore } from '@/state/index.js'
import { CreateNewProjectContent } from '@/components/create-new-project/index.jsx'
import { startDashboardData } from '@/lib/start-dashboard-data.js'
import { InlineCode } from '@/components/ui/inline-code.jsx'

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

  return (
    <section className="flex h-full w-full grow flex-col bg-white dark:bg-black">
      <div className="h-60 border-b-[1px] border-border bg-white dark:bg-black">
        <div className="mx-auto flex h-full max-w-7xl flex-col justify-end gap-2 px-16 pb-8">
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
      <div className="relative mx-auto flex h-full w-full max-w-7xl items-center justify-center px-16 py-8">
        <CreateNewProjectContent />
      </div>
    </section>
  )
}
