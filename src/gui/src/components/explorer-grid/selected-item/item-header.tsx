import { motion } from 'framer-motion'
import { useGraphStore } from '@/state/index.js'
import { useSelectedItem } from '@/components/explorer-grid/selected-item/context.jsx'
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
import { Home, Info } from 'lucide-react'
import { InlineCode } from '@/components/ui/inline-code.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { SparkAreaChart } from '@/components/ui/spark-chart.jsx'
import { transformToWeeklyDownloads } from '@/utils/transform-weekly-downloads.js'
import { splitDepID } from '@vltpkg/dep-id/browser'
import { Spec } from '@vltpkg/spec/browser'
import type { SpecOptionsFilled } from '@vltpkg/spec/browser'
import type { GridItemData } from '@/components/explorer-grid/types.js'

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

const Downloads = () => {
  const { selectedItemDetails } = useSelectedItem()

  if (
    !selectedItemDetails.downloads ||
    !selectedItemDetails.downloadsRange
  )
    return null

  return (
    <motion.div
      animate={{ opacity: 1 }}
      initial={{ opacity: 0 }}
      className="flex w-fit flex-col">
      <div className="flex w-fit flex-col items-end self-end text-right">
        <SparkAreaChart
          data={
            transformToWeeklyDownloads(
              selectedItemDetails.downloadsRange,
            ).downloads
          }
          categories={['downloads']}
          index={'day'}
          colors={['emerald']}
          className="w-full"
        />
        <p className="text-baseline mt-1 w-full self-end whitespace-nowrap text-sm font-medium text-foreground">
          {selectedItemDetails.downloads.weekly.toLocaleString()}{' '}
          <span className="text-muted-foreground">
            Weekly Downloads
          </span>
        </p>
      </div>
    </motion.div>
  )
}

export const ItemHeader = () => {
  const { selectedItemDetails, selectedItem } = useSelectedItem()
  const specOptions = useGraphStore(state => state.specOptions)

  return (
    <motion.div
      animate={{ opacity: 1 }}
      initial={{ opacity: 0 }}
      className="flex w-full justify-between gap-4 p-6">
      <div className="flex gap-4">
        <Avatar className="size-24">
          {selectedItemDetails.favicon && (
            <AvatarImage
              className="rounded-md border-[1px] bg-secondary object-cover"
              src={selectedItemDetails.favicon.src}
              alt={selectedItemDetails.favicon.alt}
            />
          )}
          <AvatarFallback className="flex h-full w-full items-center justify-center rounded-md border-[1px]">
            {selectedItem.to?.mainImporter ?
              <div className="flex h-full w-full items-center justify-center rounded-md bg-muted p-4">
                <Home
                  size={32}
                  strokeWidth={1.25}
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
                    {selectedItem.title}
                    <InlineCode
                      variant="monoGhost"
                      className="text-sm">
                      {selectedItem.version}
                    </InlineCode>
                  </TooltipTrigger>
                  <TooltipContent className="text-baseline text-sm font-medium">
                    {selectedItem.title}{' '}
                    <span className="font-normal text-muted-foreground">
                      {selectedItem.version}
                    </span>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {selectedItemDetails.greaterVersions &&
                selectedItemDetails.greaterVersions.length > 0 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger className="flex items-center justify-center">
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
              <SpecOrigin
                item={selectedItem}
                specOptions={specOptions}
              />
            )}
          </div>

          <div className="flex items-center gap-2">
            {selectedItemDetails.publisherAvatar?.src && (
              <img
                className="size-5 rounded-full outline outline-[1px] outline-border"
                src={selectedItemDetails.publisherAvatar.src}
                alt={selectedItemDetails.publisherAvatar.alt}
              />
            )}
            {selectedItemDetails.publisher &&
              !selectedItemDetails.publisherAvatar?.src && (
                <div className="flex size-5 items-center justify-center rounded-full bg-secondary bg-gradient-to-t from-neutral-100 to-neutral-400 p-0.5 outline outline-[1px] outline-border dark:from-neutral-500 dark:to-neutral-800" />
              )}
            {selectedItemDetails.publisher?.name && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger className="text-baseline cursor-default text-xs font-medium text-muted-foreground">
                    Published by:{' '}
                    <span className="text-foreground">
                      {selectedItemDetails.publisher.name}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent align="start">
                    {selectedItemDetails.publisher.name}{' '}
                    {selectedItemDetails.publisher.email}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      </div>

      <Downloads />
    </motion.div>
  )
}
