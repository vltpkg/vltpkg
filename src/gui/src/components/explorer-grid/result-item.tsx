import { type MouseEvent } from 'react'
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
import { type GridItemData, type GridItemOptions } from './types.js'

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
      const version =
        item.to.version ? `[version="${item.to.version}"]` : ''
      newQuery = `${query.trim()}${name}${version}`
    } else {
      let suffix = ''
      if (!item.sameItems) {
        const name = item.to.name ? `[name="${item.to.name}"]` : ''
        const version =
          item.to.version ? `[version="${item.to.version}"]` : ''
        suffix = `${name}${version}`
      }
      if (item.to.importer && !item.from) {
        newQuery = `:project[name="${item.to.name}"]`
      } else if (item.from) {
        const fromName = `[name="${item.from.name}"]`
        const fromVersion =
          item.from.version ? `[version="${item.from.version}"]` : ''
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
            <div className="transition-all group-hover:border-neutral-400 dark:group-hover:border-neutral-600 absolute border top-2 left-2 w-[97.5%] h-full bg-card rounded-lg"></div>
          : ''}
          <div className="transition-all group-hover:border-neutral-400 dark:group-hover:border-neutral-600 absolute border top-1 left-1 w-[99%] h-full bg-card rounded-lg"></div>
        </>
      : ''}

      {/* Card Top */}
      <Card
        renderAsLink={true}
        className={`relative group-hover:border-neutral-400 dark:group-hover:border-neutral-600 ${item.to ? 'cursor-pointer' : 'cursor-default'}`}
        onClick={onResultItemClick({ item, query, updateQuery })}>
        <CardHeader className="m-0 px-4 py-3 rounded-t-lg flex flex-row items-center justify-between border-b-[1px]">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger className="truncate">
                <CardTitle className="text-md truncate">
                  {item.title}
                </CardTitle>
              </TooltipTrigger>
              <TooltipContent>
                <p>{item.title}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {item.type ?
            <div className="flex items-center justify-center text-pretty rounded-md border-[1px] px-2.5 py-0.5 text-xs text-muted-foreground">
              <p className="font-semibold">
                {item.stacked ? '' : <span>{item.type}</span>}
                <span className="font-medium px-1 text-muted-foreground">
                  dep of:
                </span>
                {item.stacked ?
                  <span>{item.size} packages</span>
                : <span>{stringifyNode(item.from)}</span>}
              </p>
            </div>
          : ''}
        </CardHeader>

        {/* Card Bottom */}
        <div className="flex flex-row px-3 py-2 items-center justify-between">
          {item.version ?
            <TooltipProvider>
              <div className="flex items-center justify-center rounded-sm border-[1px] px-2 py-1">
                <Tooltip>
                  <TooltipTrigger>
                    <p className="text-[0.65rem] text-muted-foreground font-mono font-medium truncate w-full m-0 p-0 align-baseline">
                      {item.version}
                    </p>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{item.version}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          : ''}
          <div className="flex gap-2 overflow-x-scroll">
            {item.labels?.length ?
              item.labels.map(i => (
                <div key={i}>
                  {
                    <Badge
                      className={labelClassNamesMap.get(i) || ''}>
                      {i}
                    </Badge>
                  }
                </div>
              ))
            : ''}
          </div>
        </div>
      </Card>
    </div>
  )
}
