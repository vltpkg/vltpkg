import React from 'react'
import { ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Props } from '@astrojs/starlight/props'

const PageTitle = ({ entry }: Props) => {
  const [crumbs, setCrumbs] = useState<string[]>([])

  useEffect(() => {
    const formattedCrumbs = window.location.pathname
      .replace(/^\/|\/$/g, '')
      .split('/')
    setCrumbs(formattedCrumbs)
  }, [])

  const navigateTo = (crumb: string, _idx: number) => {
    const constructedUrl = `/${crumb}/`
    window.location.href = constructedUrl
  }

  return (
    <div className="mt-8">
      <div className="flex flex-row items-center gap-3 select-none">
        {crumbs.map((crumb, idx) => (
          <React.Fragment key={idx}>
            <p
              role="link"
              className={`text-sm cursor-pointer ${idx !== crumbs.length - 1 || idx === 0 ? 'text-muted-foreground hover:text-foreground transition-all' : 'text-foreground'}`}
              onClick={
                idx !== crumbs.length - 1 ?
                  () => navigateTo(crumb, idx)
                : undefined
              }>
              {crumb}
            </p>
            {idx !== crumbs.length - 1 ?
              <ChevronRight
                className="text-muted-foreground"
                size={16}
              />
            : null}
          </React.Fragment>
        ))}
      </div>
      <h1 className="text-2xl font-bold mt-8 mb-4">
        {entry.data.title}
      </h1>
    </div>
  )
}

export default PageTitle
