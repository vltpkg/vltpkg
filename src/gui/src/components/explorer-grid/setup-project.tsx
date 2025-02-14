import { type SyntheticEvent, useState } from 'react'
import { useGraphStore } from '@/state/index.js'
import { Button } from '@/components/ui/button.jsx'
import { Card } from '@/components/ui/card.jsx'
import { requestRouteTransition } from '@/lib/request-route-transition.js'
import { Download } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner.jsx'

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
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="flex grow flex-col bg-secondary px-8 py-8 dark:bg-black">
      <Card className="container mx-auto w-full px-8 py-8 lg:w-[1024px]">
        <h1 className="mb-2 text-3xl font-bold">Setup Project</h1>
        <p className="mb-6 text-gray-600">
          Initializing your project with the <strong>vlt</strong>{' '}
          client will replace your{' '}
          <code className="rounded-md bg-gray-200 px-1 dark:bg-gray-900">
            node_modules
          </code>{' '}
          folder with a fully compatible install managed by volt.
        </p>
        <Button onClick={onInstallClick}>
          <Download size={16} />
          Install dependencies
        </Button>
      </Card>
    </div>
  )
}
