import { motion } from 'framer-motion'
import { useGraphStore } from '@/state/index.js'
import { useSelectedItemStore } from '@/components/explorer-grid/selected-item/context.jsx'
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
import {
  Home,
  Scale,
  ArrowBigUpDash,
  EyeOff,
  Download,
  Package,
} from 'lucide-react'
import { splitDepID } from '@vltpkg/dep-id/browser'
import { defaultRegistry } from '@vltpkg/spec/browser'
import type { SpecOptionsFilled } from '@vltpkg/spec/browser'
import type { GridItemData } from '@/components/explorer-grid/types.js'
import { ProgressBar } from '@/components/ui/progress-bar.jsx'
import { getScoreColor } from '@/components/explorer-grid/selected-item/insight-score-helper.js'
import { cn } from '@/lib/utils.js'
import { isRecord } from '@/utils/typeguards.js'
import { formatDistanceStrict } from 'date-fns'
import { formatDownloadSize } from '@/utils/format-download-size.js'
import {
  ScrollArea,
  ScrollBar,
} from '@/components/ui/scroll-area.jsx'
import { isSemver } from '@/lib/external-info.js'
import { DataBadge } from '@/components/ui/data-badge.jsx'
import {
  Npm,
  Node,
  Yarn,
  Pnpm,
  Deno,
  Bun,
} from '@/components/icons/index.js'
import type { LucideIcon } from 'lucide-react'

const getEngine = (engine: string): LucideIcon => {
  switch (engine) {
    case 'node':
      return Node
    case 'npm':
      return Npm
    case 'yarn':
      return Yarn
    case 'pnpm':
      return Pnpm
    case 'deno':
      return Deno
    case 'bun':
      return Bun
    default:
      return Node
  }
}

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
          <DataBadge variant="mono" content={`${depType}:{ref}`} />
        )
      }
    }
  }
  return ''
}

export const ItemHeader = () => {
  return (
    <motion.div
      animate={{ opacity: 1 }}
      initial={{ opacity: 0 }}
      className="flex flex-col divide-y-[1px] divide-muted pb-3">
      <div className="grid w-full grid-cols-12 divide-x-[1px] divide-muted">
        <PackageImageSpec className="col-span-9 pb-3 pl-6 pt-6" />
      </div>
      <div className="flex w-full items-center justify-between px-6 py-2 empty:hidden">
        <Publisher />
        <PackageDownloadCount />
      </div>
      <div className="grid w-full grid-cols-12 divide-x-[1px] divide-muted empty:hidden">
        <PackageMetadata className="col-span-9 w-full pl-6" />
        <PackageOverallScore className="col-span-3" />
      </div>
    </motion.div>
  )
}

const PackageDownloadCount = () => {
  const manifest = useSelectedItemStore(state => state.manifest)
  const downloadsPerVersion = useSelectedItemStore(
    state => state.downloadsPerVersion,
  )

  const version = manifest?.version

  if (
    !version ||
    !isSemver(version) ||
    !downloadsPerVersion?.[version]
  )
    return null

  return (
    <DataBadge
      value={downloadsPerVersion[version].toLocaleString()}
      content="Downloads last week"
    />
  )
}

const PackageMetadata = ({ className }: { className?: string }) => {
  const versions = useSelectedItemStore(state => state.versions)
  const manifest = useSelectedItemStore(state => state.manifest)
  const currentVersion = versions?.find(
    version => version.version === manifest?.version,
  )
  const tarballUrl = currentVersion?.tarball
  const integrity = currentVersion?.integrity
  const integrityShort = integrity?.split('-')[1]?.slice(0, 6)

  const hasMetadata =
    manifest &&
    (manifest.engines ??
      manifest.type ??
      currentVersion?.unpackedSize ??
      currentVersion?.tarball ??
      currentVersion?.integrity ??
      manifest.private ??
      manifest.license)

  if (!hasMetadata) return null

  const LICENSE_TYPES = [
    'MIT',
    'ISC',
    'Apache-2.0',
    'GPL-3.0',
    'GPL-2.0',
    'LGPL-3.0',
    'BSD-2-Clause',
    'BSD-3-Clause',
    'MPL-2.0',
    'Unlicense',
    'CC0-1.0',
  ]

  return (
    <ScrollArea
      className={cn(
        'w-full overflow-hidden overflow-x-scroll border-b-[1px] border-muted py-3',
        className,
      )}>
      <div className="flex w-max gap-2">
        {manifest.private && (
          <DataBadge icon={EyeOff} content="Private Package" />
        )}
        {manifest.license &&
          LICENSE_TYPES.some(
            i =>
              i.toLowerCase() ===
              manifest.license?.trim().toLowerCase(),
          ) && (
            <DataBadge
              icon={Scale}
              value={manifest.license}
              content="License"
            />
          )}
        {manifest.type && (
          <DataBadge
            content={manifest.type === 'module' ? 'ESM' : 'CJS'}
          />
        )}
        {manifest.engines &&
          isRecord(manifest.engines) &&
          Object.entries(manifest.engines).map(
            ([engine, version], idx) => (
              <DataBadge
                key={`${engine}-${version}-${idx}`}
                icon={getEngine(engine)}
                value={version}
                content="Engines"
              />
            ),
          )}
        {currentVersion?.unpackedSize && (
          <DataBadge
            icon={Download}
            value={formatDownloadSize(currentVersion.unpackedSize)}
            content="Install size"
          />
        )}
        {tarballUrl && (
          <DataBadge
            icon={Package}
            content="Tarball"
            tooltip={{
              content: 'Copy tarball URL',
            }}
            copyToClipboard={{
              copyValue: tarballUrl,
            }}
          />
        )}
        {integrity && (
          <DataBadge
            value={integrityShort}
            content="Integrity"
            tooltip={{
              content: `Copy Integrity value: ${integrityShort}`,
            }}
            copyToClipboard={{
              copyValue: integrity,
            }}
          />
        )}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  )
}

const PackageOverallScore = ({
  className,
}: {
  className?: string
}) => {
  const setActiveTab = useSelectedItemStore(
    state => state.setActiveTab,
  )
  const packageScore = useSelectedItemStore(
    state => state.packageScore,
  )

  if (!packageScore) return null

  const overallScore = Math.round(packageScore.overall * 100)

  const onClick = () => {
    setActiveTab('insights')
  }

  return (
    <div
      onClick={onClick}
      role="button"
      className={cn(
        'relative flex w-full cursor-default flex-col items-center justify-center gap-1',
        className,
      )}>
      <p className="text-sm">
        <span className="font-medium">{`${overallScore}%`}</span>{' '}
        Package Score
      </p>
      <ProgressBar
        variant={getScoreColor(overallScore)}
        value={overallScore}
        className="absolute bottom-0"
      />
    </div>
  )
}

const PackageImage = () => {
  const favicon = useSelectedItemStore(state => state.favicon)
  const selectedItem = useSelectedItemStore(
    state => state.selectedItem,
  )

  return (
    <Avatar className="aspect-square size-[3.75rem]">
      <AvatarImage
        className="aspect-square size-[3.75rem] rounded-md border-[1px] bg-secondary object-cover"
        src={favicon?.src}
        alt={favicon?.alt ?? 'Package Icon'}
      />
      <AvatarFallback className="flex aspect-square size-[3.75rem] h-full w-full items-center justify-center rounded-md border-[1px]">
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
  const setActiveTab = useSelectedItemStore(
    state => state.setActiveTab,
  )
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
        <TooltipContent>Newer versions available</TooltipContent>
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
    <div className={cn('flex gap-4 overflow-hidden', className)}>
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

  if (!publisher) return null

  return (
    <div
      className={cn(
        'flex h-[31.508px] items-center gap-2',
        className,
      )}>
      <Avatar>
        <AvatarImage
          className="size-5 rounded-sm outline outline-[1px] outline-border"
          src={publisherAvatar?.src}
          alt={publisherAvatar?.alt ?? 'Publisher Avatar'}
        />
        <AvatarFallback className="flex size-5 items-center justify-center rounded-sm bg-secondary bg-gradient-to-t from-neutral-100 to-neutral-400 p-0.5 outline outline-[1px] outline-border dark:from-neutral-500 dark:to-neutral-800" />
      </Avatar>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger className="text-baseline cursor-default text-xs font-medium text-muted-foreground">
            Published by:{' '}
            <span className="text-foreground">{publisher.name}</span>
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
          <TooltipContent align="start">
            {publisher.name} {publisher.email}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}
