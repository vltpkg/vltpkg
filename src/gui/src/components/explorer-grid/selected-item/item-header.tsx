import { motion } from 'framer-motion'
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
import { Home, ArrowBigUpDash } from 'lucide-react'
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
import { useFocusState } from '@/components/explorer-grid/selected-item/focused-view/use-focus-state.tsx'
import { toHumanNumber } from '@/utils/human-number.ts'

import type { SpecOptionsFilled } from '@vltpkg/spec/browser'
import type { GridItemData } from '@/components/explorer-grid/types.ts'
import type { ProgressCircleVariant } from '@/components/ui/progress-circle.tsx'

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
              <DataBadge
                variant="mono"
                content={`${item.title}@${item.version}`}
                classNames={{
                  wrapperClassName: 'truncate overflow-hidden',
                }}
                tooltip={{
                  content: String(scopeValue),
                }}
              />
            )
          }
        }
        return (
          <DataBadge
            variant="mono"
            content={`${ref || 'npm'}:${item.title}@${item.version}`}
            classNames={{
              wrapperClassName: 'truncate overflow-hidden',
            }}
            tooltip={{
              content:
                ref && specOptions.registries[ref] ?
                  String(specOptions.registries[ref])
                : String(specOptions.registry || defaultRegistry),
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
              wrapperClassName: 'truncate overflow-hidden',
            }}
            content={`${depType}:${ref}`}
          />
        )
      }
    }
  }
  return ''
}

interface ItemHeaderProps extends React.PropsWithChildren {
  classNames?: {
    wrapperClassName?: string
    contentClassName?: string
    breadCrumbWrapperClassName?: string
    packageImageSpecClassName?: string
  }
}

export const ItemHeader = ({
  classNames,
  children,
}: ItemHeaderProps) => {
  const breadcrumbs = useSelectedItemStore(
    state => state.selectedItem.breadcrumbs,
  )
  const {
    wrapperClassName,
    contentClassName,
    breadCrumbWrapperClassName,
    packageImageSpecClassName,
  } = classNames ?? {}

  return (
    <motion.div
      animate={{ opacity: 1 }}
      initial={{ opacity: 0 }}
      className={cn('flex flex-col', wrapperClassName)}>
      <div className={cn('flex w-full flex-col', contentClassName)}>
        <div
          className={cn(
            'flex h-10 w-full items-center border-b-[1px] border-muted pr-6 empty:hidden',
            breadcrumbs ? 'justify-between' : 'justify-end',
            breadCrumbWrapperClassName,
          )}>
          <ItemBreadcrumbs />
          {children}
        </div>
        <PackageImageSpec
          className={cn('px-6 py-4', packageImageSpecClassName)}
        />
      </div>
    </motion.div>
  )
}

const ItemBreadcrumbs = () => {
  const breadcrumbs = useSelectedItemStore(
    state => state.selectedItem.breadcrumbs,
  )
  const { focused } = useFocusState()

  if (!breadcrumbs) return null

  return (
    <ScrollArea
      viewportClassName="flex items-center"
      className="relative flex w-full items-center overflow-hidden overflow-x-scroll">
      <div
        className={cn(
          'pointer-events-none absolute bottom-0 right-0 top-0 z-[100] h-full w-6 rounded-r-xl bg-gradient-to-l',
          focused ? 'from-background' : 'from-card',
        )}
      />
      <div
        className={cn(
          'pointer-events-none absolute bottom-0 left-0 top-0 z-[100] h-full w-6 rounded-l-xl bg-gradient-to-r',
          focused ? 'from-background' : 'from-card',
        )}
      />
      <CrumbNav className="px-6" breadcrumbs={breadcrumbs} />
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

  return (
    <Avatar className="aspect-square size-16">
      <AvatarImage
        className="aspect-square size-16 rounded-md border-[1px] bg-secondary object-cover"
        src={favicon?.src}
        alt={favicon?.alt ?? 'Package Icon'}
      />
      <AvatarFallback className="flex aspect-square size-16 h-full w-full items-center justify-center rounded-md border-[1px]">
        {selectedItem.to?.mainImporter ?
          <div className="flex h-full w-full items-center justify-center rounded-md bg-muted p-4">
            <Home
              size={32}
              strokeWidth={1.25}
              className="text-muted-foreground"
            />
          </div>
        : <div className="h-full w-full rounded-md bg-gradient-to-t from-neutral-200 to-neutral-400 dark:from-neutral-500 dark:to-neutral-800" />
        }
      </AvatarFallback>
    </Avatar>
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

const PackageImageSpec = ({ className }: { className?: string }) => {
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
                    <span className="ml-2 font-courier text-sm text-muted-foreground">
                      {selectedItem.version}
                    </span>
                  </h1>
                  <PackageNewerVersionsAvailable />
                </div>

                {specOptions && (
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
      <Publisher />
    </div>
  )
}

const Publisher = ({ className }: { className?: string }) => {
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

  const downloadCount = toHumanNumber(
    (currentVersion?.version &&
      downloads?.[currentVersion.version]) ??
      0,
  )

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
            className="size-5 rounded-sm border-[1px] border-border"
            src={publisherAvatar?.src}
            alt={publisherAvatar?.alt ?? 'Publisher Avatar'}
          />
          <AvatarFallback className="flex size-5 items-center justify-center rounded-sm bg-secondary bg-gradient-to-t from-neutral-100 to-neutral-400 p-0.5 outline outline-[1px] outline-border dark:from-neutral-500 dark:to-neutral-800" />
        </Avatar>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger className="text-baseline cursor-default text-xs font-medium text-muted-foreground">
              Published by:{' '}
              <span className="text-foreground">
                {publisher.name}
              </span>
              {currentVersion?.publishedDate && (
                <span className="ml-2">
                  {gitHeadShort}
                  {' • '}
                  {formatDistanceStrict(
                    currentVersion.publishedDate,
                    new Date(),
                    {
                      addSuffix: true,
                    },
                  )}
                </span>
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
          <p className="text-baseline cursor-default text-xs font-medium text-muted-foreground">
            <span className="mr-1 text-foreground">
              {downloadCount}
            </span>
            Downloads last week
          </p>
        </div>
      )}
    </div>
  )
}
