import { useMemo } from 'react'
import { useLocation } from 'react-router'
import { Vlt } from '@/components/icons/index.ts'
import { ExplorerHeader } from '@/components/navigation/header/explorer.tsx'
import { DashboardHeader } from '@/components/navigation/header/dashboard.tsx'
import { QueriesHeader } from '@/components/navigation/header/queries.tsx'
import { LabelsHeader } from '@/components/navigation/header/labels.tsx'
import { HelpHeader } from '@/components/navigation/header/help.tsx'
import { LinearMenu } from '@/components/navigation/linear-menu/index.tsx'

const Header = () => {
  const { pathname } = useLocation()

  const headerContent = useMemo(() => {
    if (pathname.includes('explore')) {
      return <ExplorerHeader />
    }
    if (pathname === '/') {
      return <DashboardHeader />
    }
    if (pathname === '/queries') {
      return <QueriesHeader />
    }
    if (pathname === '/labels') {
      return <LabelsHeader />
    }
    if (pathname.includes('/help')) {
      return <HelpHeader />
    }
  }, [pathname])

  return (
    <div className="flex h-16 w-full cursor-default items-center justify-between gap-7 bg-sidebar py-3 pl-[1.4rem] pr-4">
      <Vlt className="hidden md:flex" size={24} />
      <div className="flex w-full">{headerContent}</div>
      <LinearMenu />
    </div>
  )
}

export { Header }
