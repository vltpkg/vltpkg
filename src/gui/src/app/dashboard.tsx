import { useNavigate } from 'react-router'
import { useEffect } from 'react'
import { DashboardGrid } from '@/components/dashboard-grid/index.jsx'
import { useGraphStore } from '@/state/index.js'
import { startDashboardData } from '@/lib/start-dashboard-data.js'

export const Dashboard = () => {
  const dashboard = useGraphStore(state => state.dashboard)
  const buildVersion = useGraphStore(state => state.buildVersion)
  const navigate = useNavigate()
  const updateDashboard = useGraphStore(
    state => state.updateDashboard,
  )
  const updateErrorCause = useGraphStore(
    state => state.updateErrorCause,
  )
  const updateBuildVersion = useGraphStore(
    state => state.updateBuildVersion,
  )
  const stamp = useGraphStore(state => state.stamp)

  useEffect(() => {
    startDashboardData({
      navigate,
      updateErrorCause,
      updateDashboard,
      updateBuildVersion,
      stamp,
    })
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
          {buildVersion && (
            <p className="hidden text-right font-mono text-xs font-light text-muted-foreground md:inline-flex">
              build: v{buildVersion}
            </p>
          )}
        </div>
      </div>
      <DashboardContent />
    </section>
  )
}

const DashboardContent = () => {
  return <DashboardGrid />
}
