import { splitDepID, hydrate } from '@vltpkg/dep-id/browser'
import { Spec, type SpecOptionsFilled } from '@vltpkg/spec/browser'
import { Card, CardDescription } from '@/components/ui/card.jsx'
import { useGraphStore } from '@/state/index.js'
import { type GridItemData, type GridItemOptions } from './types.js'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs.jsx'
import { CodeBlock } from '../ui/shiki.jsx'
import { FileSearch2, Home, Package } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import {
  type DetailsInfo,
  fetchDetails,
} from '@/lib/external-info.js'
import { Avatar, AvatarFallback } from '@/components/ui/avatar.jsx'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip.jsx'
import { motion } from 'framer-motion'

const SpecOrigin = ({
  item,
  specOptions,
}: {
  item: GridItemData
  specOptions: SpecOptionsFilled
}) => {
  if (item.to && !item.to.mainImporter) {
    const [depType, ref] = splitDepID(item.to.id)
    switch (depType) {
      case 'registry': {
        for (const [scopeKey, scopeValue] of Object.entries(
          specOptions['scope-registries'],
        )) {
          if (item.to.name?.startsWith(scopeKey)) {
            return (
              <div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger className="px-1 py-1 text-xs text-muted-foreground font-mono m-0 align-baseline truncate">
                      <span>registered-scope</span>
                      <span>
                        {item.title}@{item.version}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      {String(scopeValue)}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )
          }
        }
        return (
          <div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger className="px-1 py-1 text-xs text-muted-foreground font-mono m-0 align-baseline truncate">
                  <span>{ref || 'npm'}:</span>
                  <span>
                    {item.title}@{item.version}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {
                    ref && specOptions.registries[ref] ?
                      specOptions.registries[ref]
                      // @ts-expect-error - tsserver is unable to find this exported property
                    : specOptions.registry || Spec.defaultRegistry
                  }
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )
      }
      case 'git':
      case 'workspace':
      case 'file':
      case 'remote': {
        return <div>{ref}</div>
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
  //const origin = specOptions && getItemOrigin({ item, specOptions })
  const linePositionRef = useRef<HTMLDivElement>(null)
  const [details, setDetails] = useState<DetailsInfo>({})
  const stamp = useGraphStore(state => state.stamp)

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

  useEffect(() => {
    async function retrieveDetails() {
      if (!item.to?.name) return
      const depIdSpec = hydrate(item.to.id, item.to.name, specOptions)
      const manifest = item.to.manifest ?? {}
      for await (const d of fetchDetails(depIdSpec, manifest)) {
        setDetails({
          ...details,
          ...d,
        })
      }
    }
    void retrieveDetails()
  }, [stamp])

  const handlePublisherAvatarError = () => {
    setDetails({
      ...details,
      publisherAvatar: undefined,
    })
  }

  return (
    <div className="relative">
      <Card className="relative my-4 border-muted-foreground">
        <div className="flex justify-stretch gap-4 w-full p-6">
          <motion.div
            className="flex gap-4 grow items-start w-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}>
            <Avatar className="size-16 rounded-lg border border-solid border-neutral-200">
              {details.favicon ?
                <motion.img
                  src={details.favicon.src}
                  alt={details.favicon.alt}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                />
              : ''}
              <AvatarFallback className="rounded-lg border-none">
                {item.to?.mainImporter ?
                  <Home size={24} />
                : <Package size={24} />}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <div className="mt-2">
                <span
                  className={`${
                    item.title.length < 9 ? 'text-3xl'
                    : item.title.length < 18 ? 'text-xl'
                    : 'text-md'
                  } font-medium`}>
                  {item.title}{' '}
                </span>
                <span
                  className={`${
                    item.title.length < 9 ? 'text-xl'
                    : item.title.length < 18 ? 'text-lg'
                    : 'text-sm'
                  } font-medium text-muted-foreground mb-[1px]`}>
                  {item.version}
                </span>
              </div>
              {specOptions ?
                <SpecOrigin item={item} specOptions={specOptions} />
              : ''}
            </div>
          </motion.div>
          <div className="flex flex-col justify-end w-full gap-4 mt-4">
            {details.downloads?.weekly ?
              <motion.div
                className="flex flex-row-reverse"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}>
                <span className="text-md font-medium text-muted-foreground text-right">
                  <span className="text-foreground">
                    {details.downloads.weekly.toLocaleString()}{' '}
                    Downloads
                  </span>{' '}
                  Last Week
                </span>
              </motion.div>
            : ''}
            <div className="flex flex-row-reverse items-center gap-2">
              {details.publisherAvatar?.src ?
                <motion.img
                  className="size-8 rounded-full"
                  src={details.publisherAvatar.src}
                  alt={details.publisherAvatar.alt}
                  onError={handlePublisherAvatarError}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                />
              : ''}
              {details.publisher?.name ?
                <motion.div
                  className="text-sm font-medium"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}>
                  <span className="text-xs text-muted-foreground mb-[1px]">
                    Published by:{' '}
                  </span>
                  <span>{details.publisher.name}</span>
                </motion.div>
              : ''}
            </div>
          </div>
        </div>
        {item.to?.manifest?.description || details.author?.name ?
          <div className="px-6 pb-6 -mt-6">
            {item.to?.manifest?.description ?
              <CardDescription className="grow content-center py-2">
                {item.to.manifest.description}
              </CardDescription>
            : ''}
            {details.author?.name ?
              <motion.div
                className="flex items-center gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}>
                <span className="text-xs font-medium text-muted-foreground">
                  Authored by: {details.author.name}
                </span>
              </motion.div>
            : ''}
          </div>
        : ''}
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
