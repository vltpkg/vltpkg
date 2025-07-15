import { Fragment, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils.ts'

export const BreadcrumbHeader = () => {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  const paths: string[] = useMemo(
    () => pathname.split('/').filter(Boolean),
    [pathname],
  )

  const navigateCrumbs = (crumbIdx: number) => {
    const newPath = paths.slice(0, crumbIdx + 1).join('/')
    void navigate(newPath)
  }

  return (
    <div className="flex items-center">
      {paths.map((crumb, idx) => (
        <Fragment key={idx}>
          {idx !== 0 && (
            <ChevronRight className="mx-0.5 size-4 text-muted-foreground" />
          )}
          <button
            onClick={() => navigateCrumbs(idx)}
            className={cn(
              'duration-250 cursor-default rounded-sm bg-transparent px-2 py-1 text-sm font-medium capitalize text-muted-foreground transition-colors hover:bg-neutral-200 hover:text-foreground dark:hover:bg-neutral-800',
              idx === paths.length - 1 && 'text-foreground',
            )}>
            {crumb}
          </button>
        </Fragment>
      ))}
    </div>
  )
}
