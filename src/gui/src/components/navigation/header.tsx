import { useEffect, useState } from 'react'
import { useGraphStore } from '@/state/index.js'

const routeNames = new Map<string, string>([
  ['/', 'Dashboard'],
  ['/error', 'Error'],
  ['/explore', 'Explore'],
  ['/dashboard', 'Dashboard'],
  ['/new-project', 'New Project'],
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

  if (route.includes('error')) return null

  return (
    <div className="flex w-full justify-between bg-white px-8 py-3 dark:bg-black">
      <h3 className="mt-1 text-2xl font-medium">{routeName}</h3>
    </div>
  )
}

export { Header }
