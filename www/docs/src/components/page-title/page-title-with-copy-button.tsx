import React from 'react'
import { ChevronRight } from 'lucide-react'
import type { Props } from '@astrojs/starlight/props'
import type { Crumb } from '@/lib/breadcrumbs.ts'
import { CopyMarkdownButton } from '@/components/copy-markdown-button/copy-markdown-button.tsx'

/**
 * Page heading for docs pages: an optional breadcrumb trail followed
 * by the page title and copy-to-markdown button.
 *
 * Purely presentational — all breadcrumb policy (when to show the
 * trail, labels, which crumbs link) lives in `getBreadcrumbs`; an
 * empty `crumbs` array renders the title alone.
 */
export interface PageTitleWithCopyButtonProps {
  entry: Props['entry']
  crumbs: Crumb[]
}

export const PageTitleWithCopyButton = ({
  entry,
  crumbs,
}: PageTitleWithCopyButtonProps) => {
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
      <div className="my-auto flex flex-col gap-4 pb-4 pt-8 sm:flex-row sm:items-start sm:justify-between lg:items-baseline">
        <h1 id="_top" className="text-3xl font-bold">
          {title}
        </h1>
        <div>
          <CopyMarkdownButton slug={entry.id} label="Copy Markdown" />
        </div>
      </div>
    </div>
  )
}
