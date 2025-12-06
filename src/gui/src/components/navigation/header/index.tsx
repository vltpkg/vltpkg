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

  const displayPathname = pathname.split('/')[1]

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
        'flex w-full cursor-default flex-col items-start justify-between gap-5 px-6 py-3 md:h-16 md:flex-row md:items-center',
        className,
      )}>
      <div className="flex w-full items-center justify-between">
        <h3 className="bg-gradient-to-tr from-neutral-500 to-neutral-900 bg-clip-text text-lg font-medium tracking-tight text-transparent capitalize dark:from-neutral-400 dark:to-neutral-50">
          {displayPathname}
        </h3>
        <div className="flex items-center gap-2 md:hidden">
          <MobileMenu />
          <UserMenu />
        </div>
      </div>
      {headerContent}
      <UserMenu className="hidden md:flex" />
    </div>
  )
}

export { Header }
