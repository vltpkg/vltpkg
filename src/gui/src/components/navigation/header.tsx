import { useLocation } from 'react-router'
import { useEffect, useState } from 'react'
import { useGraphStore } from '@/state/index.js'

const routeNames = new Map<string, string>([
  ['/', 'Dashboard'],
  ['/error', 'Error'],
  ['/explore', 'Explore'],
  ['/queries', 'Queries'],
  ['/labels', 'Labels'],
])

const Header = () => {
  const [routeName, setRouteName] = useState<string>('')
  const { pathname } = useLocation()
  const projectInfo = useGraphStore(state => state.projectInfo)

  useEffect(() => {
    /**
     * Set a clean route on the state for display
     */
    const mappedName = routeNames.get(pathname)
    if (mappedName) {
      setRouteName(mappedName)
    } else {
      setRouteName('VLT /vōlt/')
    }
  }, [pathname])

  if (pathname.includes('error')) return null
  if (pathname === '/create-new-project') return null

  if (projectInfo.vltInstalled === false) return null

  return (
    <div className="flex h-[65px] w-full items-center rounded-t-lg border-x-[1px] border-t-[1px] px-8 py-3">
      <div className="flex w-full max-w-8xl items-center">
        <h3 className="mt-1 text-lg font-medium">{routeName}</h3>
      </div>
    </div>
  )
}

export { Header }
