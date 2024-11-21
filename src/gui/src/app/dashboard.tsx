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
      window.scrollTo(0, 0)
    }

    startDashboard().catch((err: unknown) => {
      console.error(err)
      updateActiveRoute('/error')
      updateErrorCause('Failed to initialize dashboard.')
    })
  }, [stamp])

  return (
    <section className="flex grow w-full flex-col min-h-[80svh]">
      <div>
        <section className="flex items-center px-8 py-4 border-b-[1px] border-t-[1px] border-solid">
          <div className="flex flex-col gap-2 w-full">
            {dashboard?.cwd ?
              <p className="text-xs font-mono font-light text-muted-foreground">
                Directory: {dashboard.cwd}
              </p>
            : ''}
          </div>
          <div className="flex flex-col gap-2 w-full flex-end">
            {dashboard?.buildVersion ?
              <p className="text-xs font-mono font-light text-muted-foreground text-right">
                build: v{dashboard.buildVersion}
              </p>
            : ''}
          </div>
        </section>
      </div>
      <DashboardContent />
    </section>
  )
}

const DashboardContent = () => {
  return <DashboardGrid />
}
