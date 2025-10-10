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
  const { hasDashboard, isLoading, isHostedMode } =
    useDashboardRootCheck()

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

  // Show hosted mode message
  if (isHostedMode) {
    return (
      <>
        <div className="flex h-full flex-col items-center justify-center px-8 py-4">
          <div className="max-w-2xl text-center">
            <h1 className="mb-4 text-2xl font-semibold">
              Hosted Demo Mode
            </h1>
            <p className="mb-4 text-muted-foreground">
              This is a static hosted version of the VLT GUI. The
              dashboard requires a local VLT server to display project
              data.
            </p>
            <p className="text-sm text-muted-foreground">
              To use the full dashboard features, please run the GUI
              locally with{' '}
              <code className="rounded bg-muted px-2 py-1">
                vlt gui
              </code>
              .
            </p>
          </div>
        </div>
      </>
    )
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
