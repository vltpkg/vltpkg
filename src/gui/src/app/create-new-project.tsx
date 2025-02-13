import { useEffect } from 'react'
import { useGraphStore } from '@/state/index.js'
import { CreateNewProjectContent } from '@/components/create-new-project/index.jsx'
import { startDashboardData } from '@/lib/start-dashboard-data.js'

export const CreateNewProject = () => {
  const dashboard = useGraphStore(state => state.dashboard)
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
    <section className="flex min-h-[80svh] w-full grow flex-col bg-white dark:bg-black">
      <div className="flex w-full items-center justify-between border-b-[1px] border-t-[1px] border-solid px-8 py-4">
        {dashboard?.cwd ?
          <p className="font-mono text-xs font-light text-muted-foreground">
            Directory: {dashboard.cwd}
          </p>
        : ''}
        {dashboard?.buildVersion ?
          <p className="text-right font-mono text-xs font-light text-muted-foreground">
            build: v{dashboard.buildVersion}
          </p>
        : ''}
      </div>
      <CreateNewProjectContent />
    </section>
  )
}
