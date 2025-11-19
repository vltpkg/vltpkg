import { useEffect, useState } from 'react'
import { getFromConfig } from '@/lib/vlt-config.ts'
import { isHostedEnvironment } from '@/lib/environment.ts'

export const useDashboardRootCheck = (
  rerender?: any, // eslint-disable @typescript-eslint/no-explicit-any
): {
  hasDashboard: boolean
  isLoading: boolean
  dashboardRoots: string[] | null
} => {
  const [hasDashboard, setHasDashboard] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [dashboardRoots, setDashboardRoots] = useState<
    string[] | null
  >(null)
  const isHostedMode = isHostedEnvironment()

  const fetchDashboardRoot = async () => {
    // Skip fetching in hosted environments
    if (isHostedMode) {
      setIsLoading(false)
      setHasDashboard(false)
      console.info(
        'Dashboard root check skipped in hosted environment',
      )
      return
    }

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
  }, [rerender])

  return { hasDashboard, isLoading, dashboardRoots }
}
