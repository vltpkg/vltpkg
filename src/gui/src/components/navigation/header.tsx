import { useEffect, useState } from 'react'
import { useGraphStore } from '@/state/index.js'
const Header = () => {
  const [routeName, setRouteName] = useState<string | undefined>(
    undefined,
  )
  const route = useGraphStore(state => state.activeRoute)

  useEffect(() => {
    /**
     * Set a clean route on the state for display
     * */
    const cleanedRoute =
      route.split('/')[1]?.charAt(0).toUpperCase() + route.slice(2)
    setRouteName(cleanedRoute)
  }, [route])

  return (
    <div className="flex w-full items-center justify-between px-8 py-3">
      <h3 className="text-xl font-medium">{routeName}</h3>
    </div>
  )
}

export { Header }
