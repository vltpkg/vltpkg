import type { MouseEvent } from 'react'
import { stringifyNode } from '@vltpkg/graph/browser'
import { useGraphStore } from '@/state/index.ts'
import { Badge } from '@/components/ui/badge.tsx'
import { Card, CardHeader, CardTitle } from '@/components/ui/card.tsx'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip.tsx'
import { labelClassNamesMap } from '@/components/explorer-grid/label-helper.ts'
import type {
  GridItemData,
  GridItemOptions,
} from '@/components/explorer-grid/types.ts'
import { DataBadge } from '@/components/ui/data-badge.tsx'
import { Scale, EyeOff } from 'lucide-react'
import type { PackageScore } from '@vltpkg/security-archive'
import { ProgressCircle } from '@/components/ui/progress-circle.tsx'
import type { ProgressCircleVariant } from '@/components/ui/progress-circle.tsx'
import {
  getScoreColor,
  scoreColors,
} from '@/components/explorer-grid/selected-item/insight-score-helper.ts'

export type ResultItemClickOptions = {
  item: GridItemData
  query: string
  updateQuery: (query: string) => void
}

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

const PackageOverallScore = ({
  className,
  packageScore,
}: {
  className?: string
  packageScore: PackageScore
}) => {
  const averageScore = packageScore.overall * 100
  const chartColor = getScoreColor(averageScore)
  const textColor = scoreColors[chartColor]

  return (
    <div className={className}>
      <div className="duration-250 after:duration-250 relative z-[1] flex cursor-default flex-row gap-3 self-start transition-colors after:absolute after:inset-0 after:-left-[0.5rem] after:-top-[0.5rem] after:z-[-1] after:h-[calc(100%+1rem)] after:w-[calc(100%+1rem)] after:rounded-sm after:transition-all after:content-['']">
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
        <div className="flex flex-col">
          <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">
            Package Score
          </p>
          <p className="font-mono text-xs font-medium tabular-nums text-neutral-400">
            {averageScore}/100
          </p>
        </div>
      </div>
    </div>
  )
}

const onResultItemClick =
  ({ item, query, updateQuery }: ResultItemClickOptions) =>
  (e: MouseEvent) => {
    e.preventDefault()
    if (!item.to) return
    let newQuery = ''
    if (item.stacked) {
      const name = item.to.name ? `[name="${item.to.name}"]` : ''
      const version = item.to.version ? `:v(${item.to.version})` : ''
      newQuery = `${query.trim()}${name}${version}`
    } else {
      let suffix = ''
      if (!item.sameItems) {
        const name = item.to.name ? `[name="${item.to.name}"]` : ''
        const version =
          item.to.version ? `:v(${item.to.version})` : ''
        suffix = `${name}${version}`
      }
      if (item.to.importer && !item.from) {
        newQuery = `:project[name="${item.to.name}"]`
      } else if (item.from) {
        const fromName = `[name="${item.from.name}"]`
        const fromVersion =
          item.from.version ? `:v(${item.from.version})` : ''
        newQuery = `${fromName}${fromVersion} > :is(${query.trim()}${suffix})`
      } else {
        newQuery = `${query.trim()}${suffix}`
      }
    }
    updateQuery(newQuery)
    return undefined
  }

export const ResultItem = ({ item }: GridItemOptions) => {
  const updateQuery = useGraphStore(state => state.updateQuery)
  const query = useGraphStore(state => state.query)
  const manifest = item.to?.manifest
  const insights = item.to?.insights
  return (
    <div className="group relative z-10">
      {item.stacked ?
        <>
          {item.size > 2 ?
            <div className="absolute left-2 top-2 h-full w-[97.5%] rounded-lg border bg-card transition-all group-hover:border-neutral-400 dark:group-hover:border-neutral-600"></div>
          : ''}
          <div className="absolute left-1 top-1 h-full w-[99%] rounded-lg border bg-card transition-all group-hover:border-neutral-400 dark:group-hover:border-neutral-600"></div>
        </>
      : ''}

      {/* Card Top */}
      <Card
        renderAsLink={true}
        className={`duration-250 relative cursor-default transition-all group-hover:border-neutral-400 dark:group-hover:border-neutral-600`}
        onClick={onResultItemClick({ item, query, updateQuery })}>
        <CardHeader className="m-0 flex flex-row items-center justify-between rounded-t-lg border-b-[1px] px-4 py-3">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger className="cursor-default truncate">
                <CardTitle className="text-md truncate">
                  {item.title}
                </CardTitle>
              </TooltipTrigger>
              <TooltipContent>
                <p>{item.title}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <div className="flex flex-row items-center gap-2">
            {item.type && (
              <DataBadge
                classNames={{
                  valueClassName: 'lowercase',
                }}
                value={item.stacked ? '' : item.type}
                content={`dep of: ${item.stacked ? item.size : stringifyNode(item.from)}`}
              />
            )}
            {manifest?.private && (
              <DataBadge icon={EyeOff} content="Private Package" />
            )}
            {manifest?.license &&
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
            {manifest?.type && (
              <DataBadge
                content={manifest.type === 'module' ? 'ESM' : 'CJS'}
              />
            )}
            {insights?.scanned && insights.score && (
              <PackageOverallScore packageScore={insights.score} />
            )}
          </div>
        </CardHeader>

        {/* Card Bottom */}
        <div className="flex h-12 w-full items-center justify-between gap-4 border-t-[1px] px-4 py-3">
          {item.version && (
            <DataBadge
              variant="mono"
              classNames={{
                contentClassName: 'pt-0.5',
              }}
              tooltip={{ content: item.version }}
              content={item.version}
            />
          )}
          <div className="flex gap-2">
            {item.labels?.length ?
              item.labels.map(i => (
                <div key={i}>
                  <Badge className={labelClassNamesMap.get(i) || ''}>
                    {i}
                  </Badge>
                </div>
              ))
            : ''}
          </div>
        </div>
      </Card>
    </div>
  )
}
