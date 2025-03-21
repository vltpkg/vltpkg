import React from 'react'
import { ChevronRight } from 'lucide-react'
import type { Props } from '@astrojs/starlight/props'

export const PageTitle = ({
  entry,
  crumbs,
}: Props & { crumbs: string[] }) => {
  const { title } = entry.data as { title: string }

  const accumulatedPath = crumbs.reduce<string[]>(
    (acc, crumb, idx) => {
      const previousPath = acc[idx - 1] || ''
      acc.push(`${previousPath}/${crumb}`)
      return acc
    },
    [],
  )

  if (accumulatedPath.join() == '/') return <div className="mt-4" />

  return (
    <div className="mt-8">
      <div className="flex select-none flex-row items-center gap-3">
        {crumbs.map((crumb, idx) => (
          <React.Fragment key={idx}>
            <a
              href={
                idx !== crumbs.length - 1 ?
                  accumulatedPath[idx]
                : undefined
              }
              className={`cursor-pointer text-sm no-underline ${idx !== crumbs.length - 1 || idx === 0 ? 'text-muted-foreground transition-all hover:text-foreground' : 'text-foreground'}`}>
              {crumb}
            </a>
            {idx !== crumbs.length - 1 ?
              <ChevronRight
                className="text-muted-foreground"
                size={16}
              />
            : null}
          </React.Fragment>
        ))}
      </div>
      <h1 id="_top" className="mb-4 mt-8 text-3xl font-bold">
        {title}
      </h1>
    </div>
  )
}
