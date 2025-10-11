import { useMemo } from 'react'
import { useLocation } from 'react-router'
import { Vlt } from '@/components/icons/index.ts'
import { ExplorerHeader } from '@/components/navigation/header/explorer.tsx'
import { DashboardHeader } from '@/components/navigation/header/dashboard.tsx'
import { QueriesHeader } from '@/components/navigation/header/queries.tsx'
import { LabelsHeader } from '@/components/navigation/header/labels.tsx'
import { LinearMenu } from '@/components/navigation/linear-menu/index.tsx'
import { BreadcrumbHeader } from '@/components/navigation/header/breadcrumb-header.tsx'
import { isHostedEnvironment } from '@/lib/environment.ts'

const Header = () => {
  const { pathname } = useLocation()
  const isHostedMode = isHostedEnvironment()

  const headerContent = useMemo(() => {
    if (pathname.includes('explore')) {
      return <ExplorerHeader />
    }
    if (pathname === '/dashboard' && !isHostedMode) {
      return <DashboardHeader />
    }
    if (pathname === '/queries' && !isHostedMode) {
      return <QueriesHeader />
    }
    if (pathname === '/labels' && !isHostedMode) {
      return <LabelsHeader />
    }
    if (pathname.includes('/help')) {
      return <BreadcrumbHeader />
    }
    if (pathname.includes('/settings') && !isHostedMode) {
      return <BreadcrumbHeader />
    }
  }, [isHostedMode, pathname])

  return (
    <div className="flex h-16 w-full cursor-default items-center justify-between gap-5 bg-sidebar px-4 py-3">
      <div className="hidden aspect-square size-8 items-center justify-center md:flex">
        <Vlt />
      </div>
      <div className="flex w-full">{headerContent}</div>
      <LinearMenu />
    </div>
  )
}

export { Header }
