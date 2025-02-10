import { type Action, type State } from '@/state/types.js'

export type RequestDashboardDataOptions = {
  stamp: State['stamp']
}

export type StartDashboardDataOptions = {
  updateActiveRoute: Action['updateActiveRoute']
  updateDashboard: Action['updateDashboard']
  updateErrorCause: Action['updateErrorCause']
  stamp: State['stamp']
}

export const requestDashboardData = async ({
  stamp,
}: RequestDashboardDataOptions): Promise<State['dashboard']> => {
  const req = await fetch('./dashboard.json?random=' + stamp)
  const res = (await req.json()) as State['dashboard']
  return res
}

export const startDashboardData = ({
  updateActiveRoute,
  updateDashboard,
  updateErrorCause,
  stamp,
}: StartDashboardDataOptions) => {
  async function _startDashboard() {
    const dashboardData = await requestDashboardData({
      stamp,
    })
    updateDashboard(dashboardData)
  }

  void _startDashboard().catch((err: unknown) => {
    // eslint-disable-next-line no-console
    console.error(err)
    updateActiveRoute('/error')
    updateErrorCause('Failed to initialize dashboard.')
  })
}
