import { splitDepID, hydrate } from '@vltpkg/dep-id/browser'
import { Spec } from '@vltpkg/spec/browser'
import { rcompare } from '@vltpkg/semver'
import type { SpecOptionsFilled } from '@vltpkg/spec/browser'
import { Card } from '@/components/ui/card.jsx'
import { useGraphStore } from '@/state/index.js'
import type { GridItemData, GridItemOptions } from './types.js'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs.jsx'
import { CodeBlock } from '@/components/ui/shiki.jsx'
import { Home, Info } from 'lucide-react'
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
import { SparkAreaChart } from '@/components/ui/spark-chart.jsx'
import { transformToWeeklyDownloads } from '@/utils/transform-weekly-downloads.js'
import { Badge } from '@/components/ui/badge.jsx'
import { Skeleton } from '@/components/ui/skeleton.jsx'

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
                  <TooltipTrigger className="flex h-full w-full cursor-default items-center justify-start overflow-hidden">
                    <InlineCode
                      variant="mono"
                      className="mx-0 truncate">
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
              <TooltipTrigger className="flex h-full w-full cursor-default items-center justify-start overflow-hidden">
                <InlineCode variant="mono" className="mx-0 truncate">
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
  const [activeTab, setActiveTab] = useState<string>('overview')
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

  const handleTabChange = (value: string) => {
    setActiveTab(value)
  }

  return (
    <div className="relative">
      <Card className="relative my-4 border-muted">
        <motion.div
          animate={{ opacity: 1 }}
          initial={{ opacity: 0 }}
          className="flex w-full justify-between gap-4 p-6">
          <div className="flex gap-4">
            <Avatar className="size-24">
              {details.favicon && (
                <AvatarImage
                  className="rounded-md border-[1px] bg-secondary object-cover"
                  src={details.favicon.src}
                  alt={details.favicon.alt}
                />
              )}
              <AvatarFallback className="flex h-full w-full items-center justify-center rounded-md border-[1px]">
                {item.to?.mainImporter ?
                  <div className="flex h-full w-full items-center justify-center rounded-md bg-muted p-4">
                    <Home
                      size={32}
                      className="text-muted-foreground"
                    />
                  </div>
                : <div className="to:to-neutral-400 h-full w-full rounded-md bg-gradient-to-t from-neutral-100 dark:from-neutral-500 dark:to-neutral-800" />
                }
              </AvatarFallback>
            </Avatar>

            <div className="flex h-full max-w-[250px] flex-col justify-between">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger className="cursor-default truncate align-baseline text-lg font-medium">
                        {item.title}
                        <InlineCode
                          variant="monoGhost"
                          className="text-sm">
                          {item.version}
                        </InlineCode>
                      </TooltipTrigger>
                      <TooltipContent className="text-baseline text-sm font-medium">
                        {item.title}{' '}
                        <span className="font-normal text-muted-foreground">
                          {item.version}
                        </span>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  {details.greaterVersions &&
                    details.greaterVersions.length > 0 && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger
                            onClick={() => setActiveTab('versions')}
                            className="flex items-center justify-center">
                            <Badge
                              variant="outline"
                              className="cursor-default bg-secondary p-0.5 outline-[1px] outline-border">
                              <Info
                                className="text-muted-foreground"
                                size={16}
                              />
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            Newer versions available
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                </div>

                {specOptions && (
                  <SpecOrigin item={item} specOptions={specOptions} />
                )}
              </div>

              <div className="flex items-center gap-2">
                {details.publisherAvatar?.src && (
                  <img
                    className="size-5 rounded-full outline outline-[1px] outline-border"
                    src={details.publisherAvatar.src}
                    alt={details.publisherAvatar.alt}
                    onError={handlePublisherAvatarError}
                  />
                )}
                {details.publisher &&
                  !details.publisherAvatar?.src && (
                    <div className="flex size-5 items-center justify-center rounded-full bg-secondary bg-gradient-to-t from-neutral-100 to-neutral-400 p-0.5 outline outline-[1px] outline-border dark:from-neutral-500 dark:to-neutral-800" />
                  )}
                {details.publisher?.name && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger className="text-baseline cursor-default text-xs font-medium text-muted-foreground">
                        Published by:{' '}
                        <span className="text-foreground">
                          {details.publisher.name}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent align="start">
                        {details.publisher.name}{' '}
                        {details.publisher.email}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>
          </div>

          {details.downloads && (
            <motion.div
              animate={{ opacity: 1 }}
              initial={{ opacity: 0 }}
              className="flex w-fit flex-col">
              <div className="flex w-fit flex-col items-end self-end text-right">
                {details.downloadsRange ?
                  <SparkAreaChart
                    data={
                      transformToWeeklyDownloads(
                        details.downloadsRange,
                      ).downloads
                    }
                    categories={['downloads']}
                    index={'day'}
                    colors={['emerald']}
                    className="w-full"
                  />
                : <Skeleton className="h-12 w-full rounded-sm" />}
                <p className="text-baseline mt-1 w-full self-end whitespace-nowrap text-sm font-medium text-foreground">
                  {details.downloads.weekly.toLocaleString()}{' '}
                  <span className="text-muted-foreground">
                    Weekly Downloads
                  </span>
                </p>
              </div>
            </motion.div>
          )}
        </motion.div>
        <div className="w-full">
          <Tabs onValueChange={handleTabChange} value={activeTab}>
            <TabsList variant="ghost" className="w-full gap-2 px-6">
              <TabsTrigger
                variant="ghost"
                value="overview"
                className="w-fit px-2">
                Overview
              </TabsTrigger>
              <TabsTrigger
                variant="ghost"
                value="package.json"
                disabled={!item.to?.manifest}
                className="w-fit px-2">
                Manifest
              </TabsTrigger>
              <TabsTrigger
                variant="ghost"
                value="versions"
                disabled={
                  !details.versions || details.versions.length <= 0
                }
                className="w-fit px-2">
                Versions
              </TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="px-6 py-4">
              {item.to?.manifest?.description && (
                <p className="text-pretty text-sm">
                  {item.to.manifest.description}
                </p>
              )}
              {details.author?.name && (
                <p className="text-baseline mt-2 text-sm text-muted-foreground">
                  Authored by:{' '}
                  <span className="font-medium text-foreground">
                    {details.author.name}
                  </span>
                </p>
              )}
            </TabsContent>
            <TabsContent
              value="package.json"
              className="h-full rounded-b-lg bg-white dark:bg-black">
              {item.to?.manifest && (
                <CodeBlock
                  code={JSON.stringify(item.to.manifest, null, 2)}
                  lang="json"
                />
              )}
            </TabsContent>
            <TabsContent value="versions" className="px-6 py-4">
              <section className="flex flex-col gap-4">
                {details.greaterVersions &&
                  details.greaterVersions.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <p className="text-sm font-medium text-muted-foreground">
                        Greater Versions
                      </p>
                      <ul className="flex flex-col divide-y-[1px] divide-border">
                        {details.greaterVersions
                          .sort((a, b) => rcompare(a, b))
                          .map((version, idx) => (
                            <li
                              key={idx}
                              className="py-1.5 font-mono text-sm">
                              {version}
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}

                {details.versions && details.versions.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      All Versions
                    </p>
                    <ul className="flex flex-col divide-y-[1px] divide-border">
                      {details.versions
                        .sort((a, b) => rcompare(a, b))
                        .map((version, idx) => (
                          <li
                            key={idx}
                            className="py-1.5 font-mono text-sm">
                            {version}
                          </li>
                        ))}
                    </ul>
                  </div>
                )}
              </section>
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
              'absolute -right-4 top-[44px] w-4 rounded-tr-sm border-t border-muted'
            }></div>
        : ''
      }
    </div>
  )
}
