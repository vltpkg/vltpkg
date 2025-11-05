import { useNavigate } from 'react-router'
import { useState } from 'react'
import type { SyntheticEvent } from 'react'
import { useGraphStore } from '@/state/index.ts'
import { Button } from '@/components/ui/button.tsx'
import { requestRouteTransition } from '@/lib/request-route-transition.ts'
import { LoadingSpinner } from '@/components/ui/loading-spinner.tsx'
import { InlineCode } from '@/components/ui/inline-code.tsx'

export const SetupProject = () => {
  const navigate = useNavigate()
  const updateErrorCause = useGraphStore(
    state => state.updateErrorCause,
  )
  const updateQuery = useGraphStore(state => state.updateQuery)
  const updateStamp = useGraphStore(state => state.updateStamp)
  const [inProgress, setInProgress] = useState<boolean>(false)

  const onDashboardClick = (e: SyntheticEvent) => {
    e.preventDefault()
    void navigate('/')
  }

  const onInstallClick = (e: SyntheticEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setInProgress(true)
    void requestRouteTransition<{ add: Record<string, string>[] }>({
      navigate,
      updateErrorCause,
      updateQuery,
      updateStamp,
      body: {
        add: [],
      },
      url: '/install',
      destinationRoute: '/explore',
      errorMessage: 'Failed to setup project.',
    })
  }

  if (inProgress) {
    return (
      <div className="flex grow items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="relative flex h-full w-full items-center justify-center">
      <div className="flex h-full w-full max-w-7xl flex-col items-center justify-center gap-8 px-8">
        <div className="absolute inset-0 w-full rounded-xl bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#fff_60%,transparent_100%)] bg-[size:32px_32px] dark:[mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_60%,transparent_100%)]" />
        <div className="border-muted bg-card z-[4] flex w-full max-w-lg flex-col items-center justify-center gap-4 rounded-xl border-[1.6px] border-dashed px-4 py-6 text-center">
          <h3 className="text-xl font-medium">Initialize Project?</h3>
          <div>
            <p className="text-sm leading-7 text-pretty">
              Initializing this Project with the <strong>vlt</strong>{' '}
              client will replace the{' '}
              <InlineCode>node_modules</InlineCode> folder with a
              fully compatible install managed by <strong>vlt</strong>
              .{' '}
            </p>
          </div>
          <div
            className="flex items-center gap-3"
            onClick={onDashboardClick}>
            <Button
              size="sm"
              className="w-fit rounded-xl"
              variant="outline">
              Cancel
            </Button>
            <Button
              size="sm"
              className="w-fit rounded-xl"
              onClick={onInstallClick}>
              Initialize
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
