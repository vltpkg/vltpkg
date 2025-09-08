import { useEffect, useState } from 'react'
import { useGraphStore } from '@/state/index.ts'
import { getFromConfig } from '@/lib/vlt-config.ts'

export const useDashboardRootCheck = (): {
  hasDashboard: boolean
  isLoading: boolean
  dashboardRoots: string[] | null
} => {
  const [hasDashboard, setHasDashboard] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [dashboardRoots, setDashboardRoots] = useState<
    string[] | null
  >(null)

  const fetchDashboardRoot = async () => {
    try {
      setIsLoading(true)
      const result = (await getFromConfig({
        which: 'user',
        pairs: [{ key: 'dashboard-root' }],
      })) as Record<string, unknown>

      const value = result['dashboard-root']
      const dashboardRootValues =
        Array.isArray(value) ? value
        : typeof value === 'string' ? [value]
        : null
      setDashboardRoots(dashboardRootValues)
      const present =
        Array.isArray(value) ? value.length > 0
        : typeof value === 'string' ? value.length > 0
        : false

      setHasDashboard(present)
    } catch (e) {
      console.error('Error fetching dashboard root:', e)
      setHasDashboard(false)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void fetchDashboardRoot()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useGraphStore.getState().stamp])

  return { hasDashboard, isLoading, dashboardRoots }
}
