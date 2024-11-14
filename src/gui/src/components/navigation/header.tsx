import { useEffect, useState } from 'react'
import { useGraphStore } from '@/state/index.js'
import { LayoutDashboard } from 'lucide-react'
import { Button } from '@/components/ui/button.jsx'

const Header = () => {
  const [routeName, setRouteName] = useState<string | undefined>(
    undefined,
  )
  const [isOnDashboard, setIsOnDashboard] = useState<boolean>(false)
  const route = useGraphStore(state => state.activeRoute)
  const updateActiveRoute = useGraphStore(
    state => state.updateActiveRoute,
  )

  useEffect(() => {
    /**
     * Set a clean route on the state for display
     * */
    const cleanedRoute =
      route.split('/')[1]?.charAt(0).toUpperCase() + route.slice(2)
    setRouteName(cleanedRoute)

    /**
     * Conditionally render the button
     * */
    const hasDashboard = cleanedRoute
      .toLowerCase()
      .includes('dashboard')
    setIsOnDashboard(hasDashboard)
  }, [route])

  const handleButtonClick = () => {
    updateActiveRoute('/dashboard')
  }

  return (
    <div className="flex w-full items-center justify-between px-8 py-3">
      <h3 className="text-xl font-medium">{routeName}</h3>
      {!isOnDashboard && (
        <Button
          className="text-sm font-medium"
          onClick={handleButtonClick}
          variant="outline"
          size="sm">
          <LayoutDashboard strokeWidth={1.6} />
          Return to Dashboard
        </Button>
      )}
    </div>
  )
}

export { Header }
