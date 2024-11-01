import { useEffect } from 'react'
import { Logo } from '@/components/ui/logo.jsx'
import { Title } from '@/components/ui/title.jsx'
import { DashboardGrid } from '@/components/dashboard-grid/index.jsx'
import { ModeToggle } from '@/components/ui/mode-toggle.jsx'
import { Action, State } from '@/state/types.js'
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
  const data = await res.json()
  updateDashboard(data)
}

export const Dashboard = () => {
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
    <>
      <div className="grid grid-cols-7 gap-4 py-2 border-b">
        <Logo className="col-span-2 p-8" />
        <div className="col-span-5 relative pt-6 pb-1">
          <Title className="mt-2 -ml-24 pr-2 absolute">
            Dashboard
          </Title>
          <div className="flex ml-[580px]">
            <ModeToggle />
          </div>
        </div>
      </div>
      <DashboardContent />
    </>
  )
}

const DashboardContent = () => {
  return <DashboardGrid />
}
