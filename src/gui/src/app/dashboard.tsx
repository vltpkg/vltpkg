import { useNavigate } from 'react-router'
import { useEffect } from 'react'
import { DashboardGrid } from '@/components/dashboard-grid/index.tsx'
import { useGraphStore } from '@/state/index.ts'
import { startDashboardData } from '@/lib/start-data.ts'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog.tsx'
import { Skeleton } from '@/components/ui/skeleton.tsx'
import { useDashboardRootCheck } from '@/components/hooks/use-dashboard-root-check.tsx'
import { setDefaultDashboardRoot } from '@/lib/vlt-config.ts'

const handleDefaultDashboardRoot = async (
  updateStamp: () => void,
) => {
  await setDefaultDashboardRoot()
  updateStamp()
}

export const Dashboard = () => {
  const navigate = useNavigate()
  const updateDashboard = useGraphStore(
    state => state.updateDashboard,
  )
  const updateErrorCause = useGraphStore(
    state => state.updateErrorCause,
  )
  const stamp = useGraphStore(state => state.stamp)
  const updateStamp = useGraphStore(state => state.updateStamp)
  const { hasDashboard, isLoading } = useDashboardRootCheck()

  useEffect(() => {
    startDashboardData({
      navigate,
      updateErrorCause,
      updateDashboard,
      stamp,
    })
  }, [stamp, navigate, updateErrorCause, updateDashboard])

  if (isLoading) {
    return <LoadingDashboard />
  }

  if (!hasDashboard) {
    return (
      <>
        <LoadingDashboard />

        <AlertDialog defaultOpen={true} open={true}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Dashboard location not configured
              </AlertDialogTitle>
              <AlertDialogDescription className="leading-6">
                You haven't set a default dashboard location in your
                settings yet.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() =>
                  handleDefaultDashboardRoot(updateStamp)
                }>
                Use default home
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  void navigate('/settings')
                }}>
                Settings
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    )
  }

  return <DashboardGrid />
}

const LoadingDashboard = () => (
  <div className="flex h-full flex-col px-8 py-4">
    <div className="flex w-full max-w-8xl flex-col">
      <div className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 24 }).map((_, idx) => (
          <Skeleton
            key={idx}
            className="h-[150px] w-full rounded-lg border bg-muted/50"
          />
        ))}
      </div>
    </div>
  </div>
)
