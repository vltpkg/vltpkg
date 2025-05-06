import type { Action, State } from '@/state/types.ts'

export type RequestDataOptions = {
  stamp: State['stamp']
  url: string
  params?: Record<string, string | number>
}

export const requestData = async <T>({
  url,
  params = {},
  stamp,
}: RequestDataOptions): Promise<T> => {
  params.random = stamp

  const queryString = new URLSearchParams(
    params as Record<string, string>,
  ).toString()
  const fullUrl = queryString ? `${url}?${queryString}` : url

  const res = await fetch(fullUrl)
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.statusText}`)
  }

  const data = (await res.json()) as T
  return data
}

export type StartDashboardDataOptions = {
  navigate: (route: string) => void
  updateDashboard: Action['updateDashboard']
  updateErrorCause: Action['updateErrorCause']
  stamp: State['stamp']
}

export const startDashboardData = ({
  navigate,
  updateDashboard,
  updateErrorCause,
  stamp,
}: StartDashboardDataOptions) => {
  async function _startDashboard() {
    const dashboardData = await requestData<State['dashboard']>({
      url: './dashboard.json',
      stamp,
    })
    updateDashboard(dashboardData)
  }

  void _startDashboard().catch((err: unknown) => {
    console.error(err)
    navigate('/error')
    updateErrorCause('Failed to initialize dashboard.')
  })
}

export type StartAppDataOptions = {
  navigate: (route: string) => void
  updateErrorCause: Action['updateErrorCause']
  updateAppData: Action['updateAppData']
  stamp: State['stamp']
}

export const startAppData = ({
  updateAppData,
  updateErrorCause,
  navigate,
  stamp,
}: StartAppDataOptions) => {
  async function _startAppData() {
    const appData = await requestData<State['appData']>({
      url: './app-data.json',
      stamp,
    })
    updateAppData(appData)
  }

  void _startAppData().catch((err: unknown) => {
    console.error(err)
    navigate('/error')
    updateErrorCause('Failed to initialize app data.')
  })
}
