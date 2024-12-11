import React from 'react'
import { ChevronRight } from 'lucide-react'
import { type Props } from '@astrojs/starlight/props'

const PageTitle = ({
  entry,
  crumbs,
}: Props & { crumbs: string[] }) => {
  const { data } = entry

  const accumulatedPath = crumbs.reduce<string[]>(
    (acc, crumb, idx) => {
      const previousPath = acc[idx - 1] || ''
      acc.push(`${previousPath}/${crumb}`)
      return acc
    },
    [],
  )

  return (
    <div className="mt-8">
      <div className="flex flex-row items-center gap-3 select-none">
        {crumbs.map((crumb, idx) => (
          <React.Fragment key={idx}>
            <a
              href={
                idx !== crumbs.length - 1 ?
                  accumulatedPath[idx]
                : undefined
              }
              className={`no-underline text-sm cursor-pointer ${idx !== crumbs.length - 1 || idx === 0 ? 'text-muted-foreground hover:text-foreground transition-all' : 'text-foreground'}`}>
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
      <h1 id="_top" className="text-2xl font-bold mt-8 mb-4">
        {data.title}
      </h1>
    </div>
  )
}

export default PageTitle
