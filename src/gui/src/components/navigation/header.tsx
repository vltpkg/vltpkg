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
  const projectInfo = useGraphStore(state => state.projectInfo)

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
  if (route === '/new-project') return null

  if (projectInfo.vltInstalled === false) return null

  return (
    <div className="flex h-[65px] w-full items-center rounded-t-lg border-x-[1px] border-t-[1px] bg-white px-8 py-3 dark:bg-black">
      <div className="mx-auto flex w-full max-w-7xl items-center">
        <h3 className="mt-1 text-2xl font-medium">{routeName}</h3>
      </div>
    </div>
  )
}

export { Header }
