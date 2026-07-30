import React from 'react'
import { ChevronRight } from 'lucide-react'
import type { Props } from '@astrojs/starlight/props'
import type { Crumb } from './breadcrumbs.ts'

/**
 * Page heading for docs pages: an optional breadcrumb trail followed
 * by the page title.
 *
 * Purely presentational — all breadcrumb policy (when to show the
 * trail, labels, which crumbs link) lives in `getBreadcrumbs`; an
 * empty `crumbs` array renders the title alone.
 */
export const PageTitle = ({
  entry,
  crumbs,
}: Props & { crumbs: Crumb[] }) => {
  const { title } = entry.data as { title: string }

  return (
    <div className="mt-8">
      {crumbs.length > 0 && (
        <div className="flex select-none flex-row items-center gap-3">
          {crumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              {crumb.href ?
                <a
                  href={crumb.href}
                  className="cursor-pointer text-sm text-muted-foreground no-underline transition-all hover:text-foreground">
                  {crumb.label}
                </a>
              : <span
                  className={`text-sm ${idx === crumbs.length - 1 ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {crumb.label}
                </span>
              }
              {idx !== crumbs.length - 1 ?
                <ChevronRight
                  className="text-muted-foreground"
                  size={16}
                />
              : null}
            </React.Fragment>
          ))}
        </div>
      )}
      <h1 id="_top" className="mb-4 mt-8 text-3xl font-bold">
        {title}
      </h1>
    </div>
  )
}
