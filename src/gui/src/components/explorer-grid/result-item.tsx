import type { MouseEvent } from 'react'
import { stringifyNode } from '@vltpkg/graph/browser'
import { useGraphStore } from '@/state/index.js'
import { Badge } from '@/components/ui/badge.jsx'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.jsx'
import { labelClassNamesMap } from './label-helper.js'
import { GridItemData, GridItemOptions } from './types.js'

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
      if (item.to.importer) {
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
    <div className="relative">
      {item.stacked ?
        <>
          {item.size > 2 ?
            <div className="absolute border top-2 left-2 w-[97.5%] h-full bg-card rounded-lg"></div>
          : ''}
          <div className="absolute border top-1 left-1 w-[99%] h-full bg-card rounded-lg"></div>
        </>
      : ''}
      <Card
        renderAsLink={true}
        className={`relative my-4 ${item.to ? 'cursor-pointer' : 'cursor-default'}`}
        onClick={onResultItemClick({ item, query, updateQuery })}>
        <CardHeader className="rounded-t-lg relative flex flex-row -m-px p-2 px-4 border-b">
          <CardTitle className="text-md grow">{item.title}</CardTitle>
          {item.type ?
            <div className="rounded-md border px-2.5 py-0.5 text-xs text-gray-500">
              {item.stacked ?
                ''
              : <span className="font-semibold">{item.type}</span>}
              <span className="px-1 text-gray-400">dep of:</span>
              {item.stacked ?
                <span className="font-semibold">
                  {item.size} packages
                </span>
              : <span className="font-semibold">
                  {stringifyNode(item.from)}
                </span>
              }
            </div>
          : ''}
        </CardHeader>
        <div className="flex flex-row pl-4 pr-3">
          {item.version ?
            <CardDescription className="grow content-center py-2">
              {item.version}
            </CardDescription>
          : ''}
          {item.labels?.length ?
            item.labels.map(i => (
              <div key={i}>
                {
                  <Badge
                    className={`my-2 mx-1 grow-0 ${labelClassNamesMap.get(i) || ''}`}>
                    {i}
                  </Badge>
                }
              </div>
            ))
          : ''}
        </div>
      </Card>
    </div>
  )
}
