import { useLocation } from 'react-router'
import { useMemo } from 'react'
import { useGraphStore } from '@/state/index.ts'
import { InlineCode } from '@/components/ui/inline-code.tsx'
import { ChevronRight } from 'lucide-react'

const routeNames = new Map<string, string>([
  ['/', 'Dashboard'],
  ['/error', 'Error'],
  ['/explore', 'Explore'],
  ['/queries', 'Queries'],
  ['/labels', 'Labels'],
  ['/help', 'Help'],
  ['/help/selectors', 'Help / Selectors'],
])

const Header = () => {
  const { pathname } = useLocation()
  const projectInfo = useGraphStore(state => state.projectInfo)
  const dashboard = useGraphStore(state => state.dashboard)
  const appData = useGraphStore(state => state.appData)
  const graph = useGraphStore(state => state.graph)

  const contextValue = useMemo(() => {
    if (pathname.includes('/explore'))
      return graph?.projectRoot ? graph.projectRoot : null
  }, [pathname, graph])

  const routeName = useMemo(() => {
    if (pathname.includes('error')) return null
    if (pathname === '/create-new-project') return null
    if (projectInfo.vltInstalled === false && pathname === '/explore')
      return null

    return routeNames.get(pathname) || 'VLT /vōlt/'
  }, [pathname, projectInfo.vltInstalled])

  if (!routeName) return null

  return (
    <div className="flex h-[65px] w-full cursor-default items-center rounded-t-lg border-x-[1px] border-t-[1px] px-8 py-3">
      <div className="flex w-full max-w-8xl items-end">
        <h3 className="text-md font-medium">{routeName}</h3>
        {contextValue && (
          <div className="mx-2 flex items-center gap-2">
            <ChevronRight
              className="text-muted-foreground"
              size={16}
            />
            <InlineCode className="mx-0" variant="mono">
              {contextValue}
            </InlineCode>
          </div>
        )}
        {appData?.buildVersion && (
          <p className="ml-auto hidden font-courier text-xs font-medium text-muted-foreground md:block">
            build: v{appData.buildVersion}
          </p>
        )}
      </div>
    </div>
  )
}

export { Header }
