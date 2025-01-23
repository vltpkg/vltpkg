import { useEffect, useState } from 'react'
import { useGraphStore } from '@/state/index.js'

const routeNames = new Map<string, string>([
  ['/', 'Dashboard'],
  ['/error', 'Error'],
  ['/explore', 'Explore'],
  ['/dashboard', 'Dashboard'],
  ['/queries', 'Queries'],
  ['/labels', 'Labels'],
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
    <div className="flex w-full justify-between px-8 py-3 bg-white dark:bg-black">
      <h3 className="text-2xl font-bold mt-1">{routeName}</h3>
    </div>
  )
}

export { Header }
