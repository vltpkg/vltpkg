import { splitDepID, hydrate } from '@vltpkg/dep-id/browser'
import { Spec } from '@vltpkg/spec/browser'
import type { SpecOptionsFilled } from '@vltpkg/spec/browser'
import { Card, CardDescription } from '@/components/ui/card.jsx'
import { useGraphStore } from '@/state/index.js'
import type { GridItemData, GridItemOptions } from './types.js'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs.jsx'
import { CodeBlock } from '../ui/shiki.jsx'
import { Home, Package } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { fetchDetails } from '@/lib/external-info.js'
import type { DetailsInfo } from '@/lib/external-info.js'
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from '@radix-ui/react-avatar'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip.jsx'
import { motion } from 'framer-motion'
import { InlineCode } from '@/components/ui/inline-code.jsx'

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
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger className="w-fit">
                    <InlineCode className="mx-0">
                      {`${item.title}@${item.version}`}
                    </InlineCode>
                  </TooltipTrigger>
                  <TooltipContent>
                    {String(scopeValue)}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )
          }
        }
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger className="w-fit">
                <InlineCode className="mx-0">
                  {`${ref || 'npm'}:${item.title}@${item.version}`}
                </InlineCode>
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
        )
      }
      case 'git':
      case 'workspace':
      case 'file':
      case 'remote': {
        return (
          <InlineCode className="mx-0">{`${depType}:{ref}`}</InlineCode>
        )
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
        <div className="flex w-full gap-4 p-6">
          <motion.div
            className="flex w-full items-start gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}>
            <Avatar className="size-24">
              {details.favicon && (
                <AvatarImage
                  className="rounded-md border-[1px] object-cover"
                  src={details.favicon.src}
                  alt={details.favicon.alt}
                />
              )}
              <AvatarFallback className="rounded-md border-[1px]">
                {item.to?.mainImporter ?
                  <Home size={24} />
                : <Package size={24} />}
              </AvatarFallback>
            </Avatar>

            <div className="flex h-full flex-col justify-between">
              <div className="flex flex-col gap-0.5">
                <h3 className="text-baseline truncate text-lg font-medium">
                  {item.title}{' '}
                  <span className="text-sm font-normal text-muted-foreground">
                    {item.version}
                  </span>
                </h3>

                {specOptions ?
                  <SpecOrigin item={item} specOptions={specOptions} />
                : ''}
              </div>

              <div className="flex items-center gap-2">
                {details.publisherAvatar?.src ?
                  <motion.img
                    className="size-5 rounded-full outline outline-[1px] outline-border"
                    src={details.publisherAvatar.src}
                    alt={details.publisherAvatar.alt}
                    onError={handlePublisherAvatarError}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  />
                : ''}
                {details.publisher?.name ?
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}>
                    <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      Published by:
                      <span className="text-foreground">
                        {details.publisher.name}
                      </span>
                    </p>
                  </motion.div>
                : ''}
              </div>
            </div>
          </motion.div>

          {details.downloads?.weekly && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex w-full flex-col">
              <div className="flex w-fit flex-col self-end text-right">
                <p className="text-md text-baseline w-full self-end font-medium text-foreground">
                  {details.downloads.weekly.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">
                  Weekly Downloads
                </p>
              </div>
            </motion.div>
          )}
        </div>

        <div className="w-full">
          <Tabs defaultValue="package.json">
            <TabsList variant="outline" className="w-full px-6">
              <TabsTrigger
                variant="outline"
                value="overview"
                className="w-fit px-2">
                Overview
              </TabsTrigger>
              <TabsTrigger
                variant="outline"
                value="package.json"
                className="w-fit px-2">
                Manifest
              </TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="px-6 py-2">
              {item.to?.manifest?.description && (
                <CardDescription className="text-sm text-muted-foreground">
                  {item.to.manifest.description}
                </CardDescription>
              )}
              {details.author?.name && (
                <motion.div
                  className="mt-2 flex items-center gap-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}>
                  <p className="text-baseline text-sm text-muted-foreground">
                    Authored by:{' '}
                    <span className="font-medium text-foreground">
                      {details.author.name}
                    </span>
                  </p>
                </motion.div>
              )}
            </TabsContent>
            <TabsContent value="package.json" className="px-6 py-2">
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
              'absolute -right-4 top-[44px] w-4 rounded-tr-sm border-t border-solid border-neutral-300 dark:border-neutral-600'
            }></div>
        : ''
      }
    </div>
  )
}
