import { splitDepID } from '@vltpkg/dep-id/browser'
import { SpecOptionsFilled } from '@vltpkg/spec/browser'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.jsx'
import { useGraphStore } from '@/state/index.js'
import { GridItemData, GridItemOptions } from './types.js'

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
      <Card className="relative my-4 border-muted-foreground">
        <CardHeader
          className={`rounded-t-lg relative flex flex-row -m-px py-3 px-4 bg-primary dark:border dark:border-solid dark:border-muted-foreground text-white dark:text-black ${item.to?.manifest?.description ? '' : 'rounded-b-lg'}`}>
          <CardTitle className="flex items-center w-full justify-between">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {item.title}
              </span>
              <span className="mx-2">{'·'}</span>
              <span className="text-sm font-light text-muted-foreground">
                {item.version}
              </span>
            </div>
            {origin && origin !== '.' && (
              <div className="text-xs px-2 py-1 font-medium border border-solid border-neutral-200 rounded-full dark:border-gray-600">
                {origin}
              </div>
            )}
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
    </div>
  )
}
