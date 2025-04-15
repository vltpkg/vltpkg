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
import {
  Home,
  Scale,
  ArrowBigUpDash,
  EyeOff,
  Download,
  Target,
} from 'lucide-react'
import { InlineCode } from '@/components/ui/inline-code.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { SparkBarChart } from '@/components/ui/spark-chart.jsx'
import { transformToWeeklyDownloads } from '@/utils/transform-weekly-downloads.js'
import { splitDepID } from '@vltpkg/dep-id/browser'
import { Spec } from '@vltpkg/spec/browser'
import type { SpecOptionsFilled } from '@vltpkg/spec/browser'
import type { GridItemData } from '@/components/explorer-grid/types.js'
import { ProgressBar } from '@/components/ui/progress-bar.jsx'
import { getScoreColor } from '@/components/explorer-grid/selected-item/insight-score-helper.js'
import { cn } from '@/lib/utils.js'
import { GlyphIcon } from '@/components/icons/glyph-icon.jsx'
import type { ICONS } from '@/components/icons/glyph-icon.jsx'
import { isRecord } from '@/utils/typeguards.js'
import { formatDistanceStrict } from 'date-fns'
import { labelClassNamesMap } from '../label-helper.ts'
import { CopyToClipboard } from '@/components/ui/copy-to-clipboard.jsx'

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

const Downloads = ({ className }: { className?: string }) => {
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
      className={cn(
        'flex w-full flex-col items-center justify-end',
        className,
      )}>
      <SparkBarChart
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
    </motion.div>
  )
}

export const ItemHeader = () => {
  const { selectedItemDetails, manifest, unpackedSize } =
    useSelectedItem()
  const tarballUrl = selectedItemDetails.versions?.[0]?.tarball
  const hasMetadata =
    manifest &&
    (manifest.engines ??
      manifest.type ??
      unpackedSize ??
      tarballUrl ??
      manifest.private ??
      manifest.license)

  return (
    <motion.div
      animate={{ opacity: 1 }}
      initial={{ opacity: 0 }}
      className="flex flex-col pb-3">
      <div className="grid w-full grid-cols-12">
        <PackageImageSpec
          className={cn(
            'col-span-9 pb-3 pl-6 pt-6',
            selectedItemDetails.downloads &&
              'border-r-[1px] border-muted',
          )}
        />
        <Downloads className="col-span-3" />
      </div>
      <div
        className={cn(
          'grid w-full grid-cols-12',
          selectedItemDetails.publisher ?
            'border-t-[1px] border-muted'
          : 'hidden',
        )}>
        <Publisher
          className={cn(
            'col-span-9 border-muted py-5 pl-6',
            selectedItemDetails.downloads && 'border-r-[1px]',
          )}
        />
        {selectedItemDetails.downloads && (
          <div className="col-span-3 flex h-full cursor-default items-center justify-center text-center">
            <p className="w-full text-sm font-medium text-foreground">
              {selectedItemDetails.downloads.weekly.toLocaleString()}{' '}
              <span className="text-muted-foreground">Downloads</span>
            </p>
          </div>
        )}
      </div>
      <div
        className={cn(
          'grid w-full grid-cols-12',
          hasMetadata ?
            'border-b-[1px] border-t-[1px] border-muted'
          : 'hidden',
        )}>
        <PackageMetadata
          className={cn(
            'col-span-9 border-r-[1px] border-muted pl-6',
            hasMetadata && 'py-3',
          )}
        />
        <PackageOverallScore className="col-span-3" />
      </div>
    </motion.div>
  )
}

const PackageMetadata = ({ className }: { className?: string }) => {
  const { manifest, unpackedSize, selectedItemDetails } =
    useSelectedItem()
  const tarballUrl = selectedItemDetails.versions?.[0]?.tarball
  const INLINE_CODE_STYLES =
    'text-muted-foreground cursor-default relative mx-0 inline-flex items-center font-inter font-medium tracking-wide'

  if (!manifest) return null

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
    <div className={cn('flex w-full gap-2', className)}>
      {manifest.private && (
        <InlineCode
          variant="unstyled"
          className={cn(
            INLINE_CODE_STYLES,
            'gap-1 bg-rose-500/20 px-2 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400',
          )}>
          <EyeOff size={16} className="mb-0.5" />
          Private
        </InlineCode>
      )}
      {manifest.license &&
        LICENSE_TYPES.includes(manifest.license) && (
          <InlineCode
            variant="mono"
            className={cn(INLINE_CODE_STYLES, 'gap-1 px-2')}>
            <Scale size={16} className="mb-0.5" />
            {manifest.license}
          </InlineCode>
        )}
      {manifest.type && (
        <InlineCode variant="mono" className={cn(INLINE_CODE_STYLES)}>
          {manifest.type}
        </InlineCode>
      )}
      {manifest.engines &&
        isRecord(manifest.engines) &&
        Object.entries(manifest.engines).map(
          ([engine, version], idx) => (
            <InlineCode
              variant="mono"
              className={cn(
                'px-2 pl-7',
                INLINE_CODE_STYLES,
                engine === 'npm' && 'pl-8',
              )}
              key={`${engine}-${version}-${idx}`}>
              <GlyphIcon
                color="green"
                icon={engine as keyof typeof ICONS}
                size="lg"
                className={cn(
                  'absolute left-2',
                  engine === 'npm' && 'top-[0.2rem]',
                )}
              />
              {version}
            </InlineCode>
          ),
        )}
      {unpackedSize && (
        <InlineCode
          variant="mono"
          className={cn(INLINE_CODE_STYLES, 'gap-1 px-2')}>
          <Download size={16} className="mb-0.5" />
          {(unpackedSize / 1000).toFixed(0)} KB
        </InlineCode>
      )}
      {tarballUrl && (
        <CopyToClipboard
          className="font-inter"
          toolTipText="Copy tarball URL"
          copyValue={tarballUrl}>
          <Target size={16} />
          Tarball
        </CopyToClipboard>
      )}
    </div>
  )
}

const PackageOverallScore = ({
  className,
}: {
  className?: string
}) => {
  const { packageScore, setActiveTab } = useSelectedItem()

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

const PackageImageSpec = ({ className }: { className?: string }) => {
  const { selectedItemDetails, selectedItem } = useSelectedItem()
  const specOptions = useGraphStore(state => state.specOptions)

  return (
    <div className={cn('flex gap-4', className)}>
      <Avatar className="size-[3.75rem]">
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

      <div className="flex h-full w-full flex-col justify-between">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger className="cursor-default truncate align-baseline text-lg font-medium">
                  {selectedItem.title}
                  <InlineCode variant="monoGhost" className="text-sm">
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
                  <Tooltip delayDuration={150}>
                    <TooltipTrigger className="flex items-center justify-center">
                      <div className="cursor-default rounded-sm bg-green-400/30 p-0.5 transition-colors duration-150 hover:bg-green-400/40 dark:bg-green-500/30 dark:hover:bg-green-500/40">
                        <ArrowBigUpDash
                          className="text-green-600 dark:text-green-500"
                          size={16}
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      Newer versions available
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

            <div className="flex gap-1.5 overflow-y-scroll">
              {selectedItem.labels?.map((label, idx) => (
                <Badge
                  className={labelClassNamesMap.get(label) || ''}
                  key={`${selectedItem.title}-${label}-${idx}`}>
                  {label}
                </Badge>
              ))}
            </div>
          </div>

          {specOptions && (
            <SpecOrigin
              item={selectedItem}
              specOptions={specOptions}
            />
          )}
        </div>
      </div>
    </div>
  )
}

const Publisher = ({ className }: { className?: string }) => {
  const { selectedItemDetails } = useSelectedItem()
  const publishedDate =
    selectedItemDetails.versions?.[0]?.publishedDate

  return (
    <div
      className={cn(
        'flex h-[31.508px] items-center gap-2',
        className,
      )}>
      {selectedItemDetails.publisherAvatar?.src && (
        <Avatar>
          <AvatarImage
            className="size-5 rounded-sm outline outline-[1px] outline-border"
            src={selectedItemDetails.publisherAvatar.src}
            alt={selectedItemDetails.publisherAvatar.alt}
          />
          <AvatarFallback className="flex size-5 items-center justify-center rounded-sm bg-secondary bg-gradient-to-t from-neutral-100 to-neutral-400 p-0.5 outline outline-[1px] outline-border dark:from-neutral-500 dark:to-neutral-800" />
        </Avatar>
      )}
      {selectedItemDetails.publisher?.name && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger className="text-baseline cursor-default text-xs font-medium text-muted-foreground">
              Published by:{' '}
              <span className="text-foreground">
                {selectedItemDetails.publisher.name}
              </span>
              {publishedDate && (
                <span className="ml-2">
                  &bull;{' '}
                  {formatDistanceStrict(publishedDate, new Date(), {
                    addSuffix: true,
                  })}
                </span>
              )}
            </TooltipTrigger>
            <TooltipContent align="start">
              {selectedItemDetails.publisher.name}{' '}
              {selectedItemDetails.publisher.email}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  )
}
