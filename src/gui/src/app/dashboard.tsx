import { useNavigate } from 'react-router'
import { useEffect } from 'react'
import { DashboardGrid } from '@/components/dashboard-grid/index.tsx'
import { useGraphStore } from '@/state/index.ts'
import { startDashboardData } from '@/lib/start-data.ts'

export const Dashboard = () => {
  const navigate = useNavigate()
  const updateDashboard = useGraphStore(
    state => state.updateDashboard,
  )
  const updateErrorCause = useGraphStore(
    state => state.updateErrorCause,
  )
  const stamp = useGraphStore(state => state.stamp)

  useEffect(() => {
    startDashboardData({
      navigate,
      updateErrorCause,
      updateDashboard,
      stamp,
    })
  }, [stamp, navigate, updateErrorCause, updateDashboard])

  return (
    <section className="flex h-full max-h-[calc(100svh-65px-16px)] w-full grow flex-col rounded-b-lg border-x-[1px] border-b-[1px]">
      <DashboardContent />
    </section>
  )
}

const DashboardContent = () => {
  return <DashboardGrid />
}
