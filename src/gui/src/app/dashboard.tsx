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
    <section className="flex h-full w-full flex-col rounded-b-lg border-x-[1px] border-b-[1px]">
      <div className="flex h-[50px] w-full border-y-[1px] px-8 py-4">
        <div className="flex w-full max-w-8xl items-center justify-between">
          {dashboard?.cwd ?
            <p className="font-mono text-xs font-light text-muted-foreground">
              Directory: {dashboard.cwd}
            </p>
          : ''}
          {dashboard?.buildVersion ?
            <p className="hidden text-right font-mono text-xs font-light text-muted-foreground md:inline-flex">
              build: v{dashboard.buildVersion}
            </p>
          : ''}
        </div>
      </div>
      <DashboardContent />
    </section>
  )
}

const DashboardContent = () => {
  return <DashboardGrid />
}
