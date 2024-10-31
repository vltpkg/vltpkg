import { useEffect } from 'react'
import { Logo } from '@/components/ui/logo.jsx'
import { DashboardGrid } from '@/components/dashboard-grid/index.jsx'
import { ThemeSwitcher } from '@/components/ui/theme-switcher.jsx'
import { type Action, type State } from '@/state/types.js'
import { useGraphStore } from '@/state/index.js'
import { Footer } from '@/components/ui/footer.jsx'

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
    <section className="flex grow flex-col justify-between">
      <div>
        <nav
          className="flex gap-4 md:gap-0 px-8 py-4 items-center justify-between border-b-[1px] border-solid"
          role="navigation">
          <div className="flex w-full h-full items-center justify-end">
            <div className="flex items-baseline flex-1">
              <Logo />
              <div className="ml-6">
                <p className="text-md font-medium">Dashboard</p>
              </div>
            </div>
            <ThemeSwitcher />
          </div>
        </nav>
      </div>
      <DashboardContent />
      <Footer />
    </section>
  )
}

const DashboardContent = () => {
  return <DashboardGrid />
}
