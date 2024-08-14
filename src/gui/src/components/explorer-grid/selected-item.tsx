import * as React from 'react'
import { splitDepID } from '@vltpkg/dep-id/browser'
import { SpecOptionsFilled } from '@vltpkg/spec/browser'
import { Badge } from '@/components/ui/badge.jsx'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.jsx'
import { useGraphStore } from '@/state/index.js'
import { GridItemData, GridItemOptions } from './types.js'
import { labelClassNamesMap } from './label-helper.js'

const getItemOrigin = ({
  item,
  specOptions,
}: {
  item: GridItemData
  specOptions: SpecOptionsFilled
}): string => {
  if (item.to) {
    const [depType, ref] = splitDepID(item.to.id)
    switch (depType) {
      case 'registry': {
        for (const [scopeKey, scopeValue] of Object.entries(
          specOptions['scope-registries'],
        )) {
          if (item.to.name?.startsWith(scopeKey)) {
            return String(scopeValue)
          }
        }
        return ref && specOptions.registries[ref] ?
            specOptions.registries[ref]
          : specOptions.registry
      }
      case 'git':
      case 'workspace':
      case 'file':
      case 'remote': {
        return ref
      }
    }
  }
  return ''
}

export const SelectedItem = ({ item }: GridItemOptions) => {
  const specOptions = useGraphStore(state => state.specOptions)
  const origin = specOptions && getItemOrigin({ item, specOptions })

  return (
    <div className="relative">
      {item.from ?
        <Card className={`relative my-4 border-primary`}>
          <CardHeader className="flex flex-row p-2 px-3">
            <CardTitle className="text-md grow">
              {item.name}@{item.spec?.bareSpec || ''}
            </CardTitle>
            <Badge
              className={`grow-0 ${labelClassNamesMap.get(item.type) || ''}`}>
              {item.type}
            </Badge>
          </CardHeader>
          <div className="absolute border-l border-solid border-primary w-1 h-[17px] -bottom-[17px] left-1/2"></div>
        </Card>
      : ''}
      <Card className="relative my-4 border-primary">
        <CardHeader className="rounded-t-lg relative flex flex-row -m-px p-2 px-4 bg-primary text-primary-foreground">
          <CardTitle className="grow">
            <span className="text-xl">{item.title}</span>
            <span className="mx-2">{'·'}</span>
            <span className="text-lg text-gray-200">
              {item.version}
            </span>
            {origin ?
              <div className="text-xs text-gray-200 font-light border border-solid border-gray-200 rounded-sm p-0.5 px-2 float-right mt-[3px]">
                {origin}
              </div>
            : ''}
          </CardTitle>
        </CardHeader>
        <div className="flex flex-row pl-4 pr-3">
          {item.to?.manifest?.description ?
            <CardDescription className="grow content-center py-2">
              {item.to.manifest.description}
            </CardDescription>
          : ''}
        </div>
      </Card>
      {
        // Draw the connection line between dependents and the selected item
        item.from && item.to?.edgesIn && item.to.edgesIn.size > 1 ?
          <div className="absolute border-t border-l border-solid border-gray-300 rounded-tl-sm w-2 h-2 top-20 -left-2"></div>
        : ''
      }
      {
        // Draw the connection line between dependencies and the selected item
        item.to?.edgesOut && item.to.edgesOut.size > 0 ?
          <div
            className={`absolute border-t border-r border-solid border-gray-300 rounded-tr-sm w-2 ${item.from ? 'h-2 top-20' : 'h-20 top-5'} -right-2`}></div>
        : ''
      }
    </div>
  )
}
