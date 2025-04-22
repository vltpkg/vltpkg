import type { Action, State } from '@/state/types.js'

export type RequestDashboardDataOptions = {
  stamp: State['stamp']
}

export type StartDashboardDataOptions = {
  navigate: (route: string) => void
  updateDashboard: Action['updateDashboard']
  updateErrorCause: Action['updateErrorCause']
  updateBuildVersion: Action['updateBuildVersion']
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
  navigate,
  updateDashboard,
  updateBuildVersion,
  updateErrorCause,
  stamp,
}: StartDashboardDataOptions) => {
  async function _startDashboard() {
    const dashboardData = await requestDashboardData({
      stamp,
    })
    updateDashboard(dashboardData)
    updateBuildVersion(dashboardData?.buildVersion)
  }

  void _startDashboard().catch((err: unknown) => {
    // eslint-disable-next-line no-console
    console.error(err)
    navigate('/error')
    updateErrorCause('Failed to initialize dashboard.')
  })
}
