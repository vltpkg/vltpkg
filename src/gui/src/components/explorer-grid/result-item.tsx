import type { MouseEvent } from 'react'
import { stringifyNode } from '@vltpkg/graph/browser'
import { useGraphStore } from '@/state/index.js'
import { Badge } from '@/components/ui/badge.jsx'
import { Card, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip.jsx'
import { labelClassNamesMap } from './label-helper.js'
import type { GridItemData, GridItemOptions } from './types.js'
import { DataBadge } from '@/components/ui/data-badge.jsx'

export type ResultItemClickOptions = {
  item: GridItemData
  query: string
  updateQuery: (query: string) => void
}

const onResultItemClick =
  ({ item, query, updateQuery }: ResultItemClickOptions) =>
  (e: MouseEvent) => {
    e.preventDefault()
    if (!item.to) return
    let newQuery = ''
    if (item.stacked) {
      const name = item.to.name ? `[name="${item.to.name}"]` : ''
      const version = item.to.version ? `:v(${item.to.version})` : ''
      newQuery = `${query.trim()}${name}${version}`
    } else {
      let suffix = ''
      if (!item.sameItems) {
        const name = item.to.name ? `[name="${item.to.name}"]` : ''
        const version =
          item.to.version ? `:v(${item.to.version})` : ''
        suffix = `${name}${version}`
      }
      if (item.to.importer && !item.from) {
        newQuery = `:project[name="${item.to.name}"]`
      } else if (item.from) {
        const fromName = `[name="${item.from.name}"]`
        const fromVersion =
          item.from.version ? `:v(${item.from.version})` : ''
        newQuery = `${fromName}${fromVersion} > :is(${query.trim()}${suffix})`
      } else {
        newQuery = `${query.trim()}${suffix}`
      }
    }
    updateQuery(newQuery)
    return undefined
  }

export const ResultItem = ({ item }: GridItemOptions) => {
  const updateQuery = useGraphStore(state => state.updateQuery)
  const query = useGraphStore(state => state.query)
  return (
    <div className="group relative z-10">
      {item.stacked ?
        <>
          {item.size > 2 ?
            <div className="absolute left-2 top-2 h-full w-[97.5%] rounded-lg border bg-card transition-all group-hover:border-neutral-400 dark:group-hover:border-neutral-600"></div>
          : ''}
          <div className="absolute left-1 top-1 h-full w-[99%] rounded-lg border bg-card transition-all group-hover:border-neutral-400 dark:group-hover:border-neutral-600"></div>
        </>
      : ''}

      {/* Card Top */}
      <Card
        renderAsLink={true}
        className={`duration-250 relative cursor-default transition-all group-hover:border-neutral-400 dark:group-hover:border-neutral-600`}
        onClick={onResultItemClick({ item, query, updateQuery })}>
        <CardHeader className="m-0 flex flex-row items-center justify-between rounded-t-lg border-b-[1px] px-4 py-3">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger className="cursor-default truncate">
                <CardTitle className="text-md truncate">
                  {item.title}
                </CardTitle>
              </TooltipTrigger>
              <TooltipContent>
                <p>{item.title}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {item.type && (
            <DataBadge
              classNames={{
                valueClassName: 'lowercase',
              }}
              value={item.stacked ? '' : item.type}
              content={`dep of: ${item.stacked ? item.size : stringifyNode(item.from)}`}
            />
          )}
        </CardHeader>

        {/* Card Bottom */}
        <div className="flex h-12 w-full items-center justify-between gap-4 border-t-[1px] px-4 py-3">
          {item.version && (
            <DataBadge
              variant="mono"
              classNames={{
                contentClassName: 'pt-0.5',
              }}
              tooltip={{ content: item.version }}
              content={item.version}
            />
          )}
          <div className="flex gap-2">
            {item.labels?.length ?
              item.labels.map(i => (
                <div key={i}>
                  <Badge className={labelClassNamesMap.get(i) || ''}>
                    {i}
                  </Badge>
                </div>
              ))
            : ''}
          </div>
        </div>
      </Card>
    </div>
  )
}
