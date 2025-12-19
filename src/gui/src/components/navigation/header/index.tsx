import { useMemo } from 'react'
import { useLocation } from 'react-router'
import { ExplorerHeader } from '@/components/navigation/header/explorer.tsx'
import { DashboardHeader } from '@/components/navigation/header/dashboard.tsx'
import { QueriesHeader } from '@/components/navigation/header/queries.tsx'
import { LabelsHeader } from '@/components/navigation/header/labels.tsx'
import { SearchHeader } from '@/components/navigation/header/search.tsx'
import { BreadcrumbHeader } from '@/components/navigation/header/breadcrumb-header.tsx'
import { MobileMenu } from '@/components/navigation/header/mobile.tsx'
import { UserMenu } from '@/components/auth/index.tsx'
import { isHostedEnvironment } from '@/lib/environment.ts'
import { cn } from '@/lib/utils.ts'

import type { ComponentProps } from 'react'

type HeaderProps = ComponentProps<'div'>

const Header = ({ className }: HeaderProps) => {
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
    if (pathname === '/search') {
      return <SearchHeader />
    }
    if (pathname.includes('/help')) {
      return <BreadcrumbHeader />
    }
    if (pathname.includes('/settings') && !isHostedMode) {
      return <BreadcrumbHeader />
    }
  }, [pathname, isHostedMode])

  return (
    <div
      className={cn(
        'flex w-full cursor-default items-center justify-between gap-5 px-6 py-3 md:h-16',
        className,
      )}>
      {headerContent}
      <MobileMenu className="md:hidden" />
      <UserMenu />
    </div>
  )
}

export { Header }
