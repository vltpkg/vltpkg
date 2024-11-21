import { useEffect, useState } from 'react'
import { useGraphStore } from '@/state/index.js'

const routeNames = new Map<string, string>([
  ['/', 'Dashboard'],
  ['/error', 'Error'],
  ['/explore', 'Explore'],
  ['/dashboard', 'Dashboard'],
])

const Header = () => {
  const [routeName, setRouteName] = useState<string>('')
  const route = useGraphStore(state => state.activeRoute)

  useEffect(() => {
    /**
     * Set a clean route on the state for display
     */
    const mappedName = routeNames.get(route)
    if (mappedName) {
      setRouteName(mappedName)
    } else {
      setRouteName('VLT /vōlt/')
    }
  }, [route])

  return (
    <div className="flex w-full justify-between px-8 py-3">
      <h3 className="text-xl font-medium mt-1">{routeName}</h3>
    </div>
  )
}

export { Header }
