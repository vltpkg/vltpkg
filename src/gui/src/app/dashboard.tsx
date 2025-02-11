import { useEffect } from 'react'
import { DashboardGrid } from '@/components/dashboard-grid/index.jsx'
import { useGraphStore } from '@/state/index.js'
import { startDashboardData } from '@/lib/start-dashboard-data.js'

export const Dashboard = () => {
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
      updateErrorCause,
      updateDashboard,
      stamp,
    })

    history.pushState(
      { query: '', route: '/dashboard' },
      '',
      '/dashboard',
    )
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    window.scrollTo?.(0, 0)
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
      <DashboardContent />
    </section>
  )
}

const DashboardContent = () => {
  return <DashboardGrid />
}
