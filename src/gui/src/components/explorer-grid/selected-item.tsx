import { splitDepID } from '@vltpkg/dep-id/browser'
import { type SpecOptionsFilled } from '@vltpkg/spec/browser'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.jsx'
import { useGraphStore } from '@/state/index.js'
import { type GridItemData, type GridItemOptions } from './types.js'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs.jsx'
import { CodeBlock } from '../ui/shiki.jsx'
import { FileSearch2 } from 'lucide-react'
import { useEffect, useRef } from 'react'

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
  const updateLinePositionReference = useGraphStore(
    state => state.updateLinePositionReference,
  )
  const origin = specOptions && getItemOrigin({ item, specOptions })
  const linePositionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleResize = () => {
      const rect = linePositionRef.current?.getBoundingClientRect()
      if (rect?.top) {
        updateLinePositionReference(rect.top)
      }
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  })

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
        <div className="p-4">
          {item.to?.manifest?.description ?
            <CardDescription className="grow content-center py-2">
              {item.to.manifest.description}
            </CardDescription>
          : ''}
        </div>
        <div className="px-4 pb-4 w-full">
          <Tabs defaultValue="package.json">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="package.json" className="w-36">
                <FileSearch2 size={16} className="mr-2" />
                package.json
              </TabsTrigger>
            </TabsList>
            <TabsContent value="package.json">
              <CodeBlock
                code={
                  item.to?.manifest ?
                    JSON.stringify(item.to.manifest, null, 2)
                  : ''
                }
                lang="json"
              />
            </TabsContent>
          </Tabs>
        </div>
      </Card>
      {
        // Draw the connection line between dependencies and the selected item
        item.to?.edgesOut && item.to.edgesOut.size > 0 ?
          <div
            ref={linePositionRef}
            className={
              'absolute border-t border-solid border-neutral-300 dark:border-neutral-600 rounded-tr-sm w-4 top-[44px] -right-4'
            }></div>
        : ''
      }
    </div>
  )
}
