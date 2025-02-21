import { useState } from 'react'
import type { SyntheticEvent } from 'react'
import { useGraphStore } from '@/state/index.js'
import { Button } from '@/components/ui/button.jsx'
import { requestRouteTransition } from '@/lib/request-route-transition.js'
import { LoadingSpinner } from '@/components/ui/loading-spinner.jsx'
import { InlineCode } from '@/components/ui/inline-code.jsx'

export const SetupProject = () => {
  const updateActiveRoute = useGraphStore(
    state => state.updateActiveRoute,
  )
  const updateErrorCause = useGraphStore(
    state => state.updateErrorCause,
  )
  const updateQuery = useGraphStore(state => state.updateQuery)
  const updateStamp = useGraphStore(state => state.updateStamp)
  const [inProgress, setInProgress] = useState<boolean>(false)

  const onDashboardClick = (e: SyntheticEvent) => {
    e.preventDefault()
    updateActiveRoute('/')
  }

  const onInstallClick = (e: SyntheticEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setInProgress(true)
    void requestRouteTransition<{ add: Record<string, string>[] }>({
      updateActiveRoute,
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
    <div className="relative flex h-full w-full items-center justify-center rounded-lg border-[1px] bg-white dark:bg-black">
      <div className="flex h-full w-full max-w-7xl flex-col items-center justify-center gap-8 px-8">
        <div className="absolute inset-0 w-full rounded-lg bg-white bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#fff_60%,transparent_100%)] dark:bg-black dark:[mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_60%,transparent_100%)]" />
        <div className="z-[4] flex w-full max-w-lg flex-col items-center justify-center gap-4 rounded-lg border-[1.6px] border-dashed bg-white px-4 py-6 text-center dark:bg-black">
          <h3 className="text-xl font-medium">Initialize Project?</h3>
          <div>
            <p className="text-pretty text-sm leading-7">
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
            <Button className="w-fit" variant="outline">
              Cancel
            </Button>
            <Button className="w-fit" onClick={onInstallClick}>
              Initialize
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
