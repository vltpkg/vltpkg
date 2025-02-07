import { useEffect } from 'react'
import { DashboardGrid } from '@/components/dashboard-grid/index.jsx'
import { type Action, type State } from '@/state/types.js'
import { useGraphStore } from '@/state/index.js'

type StartDashboardData = {
  updateDashboard: Action['updateDashboard']
  stamp: State['stamp']
}

const startDashboardData = async ({
  updateDashboard,
  stamp,
}: StartDashboardData) => {
  const res = await fetch('./dashboard.json?random=' + stamp)
  const data = (await res.json()) as State['dashboard']
  updateDashboard(data)
}

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

  // only load dashboard data when we want to manually update the
  // state in the app, to make sure we're controlling it, we use the
  // stamp state as a dependency of `useEffect` to trigger the load.
  useEffect(() => {
    async function startDashboard() {
      await startDashboardData({
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
    }

    startDashboard().catch((err: unknown) => {
      console.error(err)
      updateActiveRoute('/error')
      updateErrorCause('Failed to initialize dashboard.')
    })
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
