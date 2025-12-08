import { Fragment } from 'react'
import { useGraphStore } from '@/state/index.ts'
import {
  useSelectedItemStore,
  useTabNavigation,
} from '@/components/explorer-grid/selected-item/context.tsx'
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from '@radix-ui/react-avatar'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipPortal,
  TooltipTrigger,
} from '@/components/ui/tooltip.tsx'
import { Home, ArrowBigUpDash, Dot } from 'lucide-react'
import { splitDepID } from '@vltpkg/dep-id/browser'
import { defaultRegistry } from '@vltpkg/spec/browser'
import {
  getScoreColor,
  scoreColors,
} from '@/components/explorer-grid/selected-item/insight-score-helper.ts'
import { cn } from '@/lib/utils.ts'
import { formatDistanceStrict } from 'date-fns'
import {
  ScrollArea,
  ScrollBar,
} from '@/components/ui/scroll-area.tsx'
import { DataBadge } from '@/components/ui/data-badge.tsx'
import { ProgressCircle } from '@/components/ui/progress-circle.tsx'
import { CrumbNav } from '@/components/navigation/crumb-nav.tsx'
import { toHumanNumber } from '@/utils/human-number.ts'
import { getPackageShortName } from '@/utils/get-package-shortname.ts'

import type { SpecOptionsFilled } from '@vltpkg/spec/browser'
import type { GridItemData } from '@/components/explorer-grid/types.ts'
import type { ProgressCircleVariant } from '@/components/ui/progress-circle.tsx'

const SpecOrigin = ({
  item,
  specOptions,
}: {
  item: GridItemData
  specOptions?: SpecOptionsFilled
}) => {
  // Get the manifest version for external packages
  const manifest = useSelectedItemStore(state => state.manifest)

  // For external packages (no item.to), show npm registry badge
  if (!item.to) {
    // Use manifest version if available, fallback to item.version
    const version = manifest?.version || item.version

    return (
      <DataBadge
        variant="mono"
        content={`npm:${item.name}@${version}`}
        classNames={{
          wrapperClassName:
            'truncate overflow-hidden !bg-background !rounded-lg',
        }}
        tooltip={{
          content: defaultRegistry,
        }}
      />
    )
  }

  if (!item.to.mainImporter && specOptions) {
    const [depType, ref] = splitDepID(item.to.id)
    switch (depType) {
      case 'registry': {
        for (const [scopeKey, scopeValue] of Object.entries(
          specOptions['scope-registries'],
        )) {
          if (item.to.name?.startsWith(scopeKey)) {
            return (
              <DataBadge
                variant="mono"
                content={`${item.name}@${item.version}`}
                classNames={{
                  wrapperClassName:
                    '!bg-background !rounded-lg truncate overflow-hidden',
                }}
                tooltip={{
                  content: scopeValue,
                }}
              />
            )
          }
        }
        return (
          <DataBadge
            variant="mono"
            content={`${ref || 'npm'}:${item.name}@${item.version}`}
            classNames={{
              wrapperClassName:
                '!bg-background !rounded-lg truncate overflow-hidden',
            }}
            tooltip={{
              content:
                ref && specOptions.registries[ref] ?
                  specOptions.registries[ref]
                : specOptions.registry || defaultRegistry,
            }}
          />
        )
      }
      case 'git':
      case 'workspace':
      case 'file':
      case 'remote': {
        return (
          <DataBadge
            variant="mono"
            classNames={{
              wrapperClassName:
                '!bg-background !rounded-lg truncate overflow-hidden',
            }}
            content={`${depType}:${ref}`}
          />
        )
      }
    }
  }
  return ''
}

export const ItemBreadcrumbs = () => {
  const breadcrumbs = useSelectedItemStore(
    state => state.selectedItem.breadcrumbs,
  )

  if (!breadcrumbs) return null

  return (
    <ScrollArea
      viewportClassName="flex items-center"
      className="relative flex w-full items-center overflow-hidden overflow-x-scroll">
      <CrumbNav breadcrumbs={breadcrumbs} />
      <ScrollBar className="z-[102]" orientation="horizontal" />
    </ScrollArea>
  )
}

const PackageOverallScore = ({
  className,
}: {
  className?: string
}) => {
  const { setActiveTab } = useTabNavigation()
  const packageScore = useSelectedItemStore(
    state => state.packageScore,
  )

  if (!packageScore) return null
  const averageScore = packageScore.overall * 100
  const chartColor = getScoreColor(averageScore)
  const textColor = scoreColors[chartColor]

  const onClick = () => {
    setActiveTab('insights')
  }

  return (
    <div className={className}>
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger onClick={onClick}>
            <ProgressCircle
              value={averageScore}
              variant={chartColor as ProgressCircleVariant}
              strokeWidth={5}
              className="size-9">
              <p
                className="font-mono text-xs font-medium tabular-nums"
                style={{ color: textColor }}>
                {averageScore}
              </p>
            </ProgressCircle>
          </TooltipTrigger>
          <TooltipPortal>
            <TooltipContent>See more insights</TooltipContent>
          </TooltipPortal>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}

const PackageImage = () => {
  const favicon = useSelectedItemStore(state => state.favicon)
  const selectedItem = useSelectedItemStore(
    state => state.selectedItem,
  )

  const packageShortName = getPackageShortName(selectedItem.name)

  return (
    <div className="bg-secondary relative aspect-square size-16 rounded-xl border">
      {favicon ?
        <img
          className="absolute inset-0 size-full rounded-xl object-cover"
          src={favicon.src}
          alt={favicon.alt}
        />
      : selectedItem.to?.mainImporter ?
        <div className="absolute inset-0 flex size-full items-center justify-center rounded-xl">
          <Home
            size={32}
            strokeWidth={1.25}
            className="text-muted-foreground"
          />
        </div>
      : <div className="absolute inset-0 flex h-full w-full items-center justify-center rounded-xl bg-gradient-to-t from-neutral-200 to-neutral-400 dark:from-neutral-500 dark:to-neutral-800">
          <span className="text-muted-foreground text-2xl font-medium">
            {packageShortName}
          </span>
        </div>
      }
    </div>
  )
}

const PackageNewerVersionsAvailable = () => {
  const { setActiveTab } = useTabNavigation()
  const greaterVersions = useSelectedItemStore(
    state => state.greaterVersions,
  )

  if (!greaterVersions || greaterVersions.length === 0) return null

  return (
    <TooltipProvider>
      <Tooltip delayDuration={150}>
        <TooltipTrigger
          onClick={() => setActiveTab('versions')}
          className="flex items-center justify-center">
          <div className="cursor-default rounded-sm border-[1px] border-green-600 bg-green-400/30 p-0.5 transition-colors duration-150 hover:bg-green-400/40 dark:border-green-500 dark:bg-green-500/30 dark:hover:bg-green-500/40">
            <ArrowBigUpDash
              className="text-green-600 dark:text-green-500"
              size={16}
            />
          </div>
        </TooltipTrigger>
        <TooltipPortal>
          <TooltipContent>Newer versions available</TooltipContent>
        </TooltipPortal>
      </Tooltip>
    </TooltipProvider>
  )
}

export const PackageImageSpec = ({
  className,
}: {
  className?: string
}) => {
  const selectedItem = useSelectedItemStore(
    state => state.selectedItem,
  )
  const specOptions = useGraphStore(state => state.specOptions)

  return (
    <div
      className={cn(
        'flex flex-col gap-2 overflow-hidden',
        className,
      )}>
      <div className="flex justify-between gap-4 overflow-hidden">
        <div className="flex gap-4">
          <PackageImage />
          <ScrollArea className="w-full overflow-x-scroll">
            <div className="flex h-full w-full flex-col justify-between">
              <div className="flex w-full flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <h1 className="w-fit max-w-full cursor-default align-baseline text-lg font-medium">
                    {selectedItem.title}
                    <span className="font-courier text-muted-foreground ml-2 text-sm">
                      {selectedItem.version}
                    </span>
                  </h1>
                  <PackageNewerVersionsAvailable />
                </div>

                {(specOptions ?? !selectedItem.to) && (
                  <SpecOrigin
                    item={selectedItem}
                    specOptions={specOptions}
                  />
                )}
              </div>
            </div>

            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>

        <PackageOverallScore />
      </div>
    </div>
  )
}

export const Publisher = ({ className }: { className?: string }) => {
  const publisher = useSelectedItemStore(state => state.publisher)
  const versions = useSelectedItemStore(state => state.versions)
  const manifest = useSelectedItemStore(state => state.manifest)
  const currentVersion = versions?.find(
    version => version.version === manifest?.version,
  )
  const publisherAvatar = useSelectedItemStore(
    state => state.publisherAvatar,
  )
  const gitHeadShort = currentVersion?.gitHead?.slice(0, 6)
  const downloads = useSelectedItemStore(
    state => state.downloadsPerVersion,
  )

  // Use currentVersion.version if available, fallback to manifest.version for external packages
  const versionKey = currentVersion?.version ?? manifest?.version
  const rawDownloadCount =
    (versionKey && downloads?.[versionKey]) || 0
  const downloadCount =
    rawDownloadCount > 0 ? toHumanNumber(rawDownloadCount) : null

  const authorNameShort =
    publisher?.name ? publisher.name.substring(0, 2) : '?'

  if (!publisher) return null

  return (
    <div
      className={cn(
        'flex w-full items-center justify-between gap-2 py-1',
        className,
      )}>
      <div className="flex items-center gap-2">
        <Avatar>
          <AvatarImage
            className="border-border size-5 rounded-sm border-[1px]"
            src={publisherAvatar?.src}
            alt={publisherAvatar?.alt ?? 'Publisher Avatar'}
          />
          <AvatarFallback className="bg-secondary outline-border flex size-5 items-center justify-center rounded-sm bg-gradient-to-t from-neutral-100 to-neutral-400 p-0.5 outline outline-[1px] dark:from-neutral-500 dark:to-neutral-800">
            <span className="text-muted-foreground text-xs font-medium">
              {authorNameShort}
            </span>
          </AvatarFallback>
        </Avatar>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger className="text-muted-foreground inline-flex cursor-default items-center gap-1 text-xs font-medium">
              Published by:{' '}
              <span className="text-foreground">
                {publisher.name}
              </span>
              {currentVersion?.publishedDate && (
                <Fragment>
                  <Dot className="size-3.5" />
                  <span className="inline-flex items-center gap-1">
                    {gitHeadShort && (
                      <Fragment>
                        {gitHeadShort}
                        <Dot className="size-3.5" />
                      </Fragment>
                    )}
                    {formatDistanceStrict(
                      currentVersion.publishedDate,
                      new Date(),
                      {
                        addSuffix: true,
                      },
                    )}
                  </span>
                </Fragment>
              )}
            </TooltipTrigger>
            <TooltipPortal>
              <TooltipContent align="start">
                {publisher.name} {publisher.email}
              </TooltipContent>
            </TooltipPortal>
          </Tooltip>
        </TooltipProvider>
      </div>
      {downloadCount && (
        <div className="flex items-center gap-2">
          <p className="text-baseline text-muted-foreground cursor-default text-xs font-medium">
            <span className="text-foreground mr-1">
              {downloadCount}
            </span>
            Downloads last week
          </p>
        </div>
      )}
    </div>
  )
}
