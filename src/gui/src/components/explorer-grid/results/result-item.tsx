import { stringifyNode } from '@vltpkg/graph/browser'
import { useGraphStore } from '@/state/index.ts'
import { Badge } from '@/components/ui/badge.tsx'
import { Card, CardHeader } from '@/components/ui/card.tsx'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip.tsx'
import { labelClassNamesMap } from '@/components/explorer-grid/label-helper.ts'
import { DataBadge } from '@/components/ui/data-badge.tsx'
import { Scale, EyeOff } from 'lucide-react'
import { ProgressCircle } from '@/components/ui/progress-circle.tsx'
import {
  getScoreColor,
  scoreColors,
} from '@/components/explorer-grid/selected-item/insight-score-helper.ts'
import { LICENSE_TYPES } from '@/lib/constants/index.ts'
import { cn } from '@/lib/utils.ts'

import type { MouseEvent } from 'react'
import type {
  GridItemData,
  GridItemOptions,
} from '@/components/explorer-grid/types.ts'
import type { ProgressCircleVariant } from '@/components/ui/progress-circle.tsx'
import type { Insights } from '@vltpkg/query'

export type ResultItemClickOptions = {
  item: GridItemData
  query: string
  updateQuery: (query: string) => void
}

const PackageOverallScore = ({
  className,
  insights,
}: {
  className?: string
  insights: Insights | undefined
}) => {
  if (!insights || !insights.scanned || !insights.score) return null

  const packageScore = insights.score
  const averageScore = packageScore.overall * 100
  const chartColor = getScoreColor(averageScore)
  const textColor = scoreColors[chartColor]

  return (
    <div className={className}>
      <ProgressCircle
        value={averageScore}
        variant={chartColor as ProgressCircleVariant}
        strokeWidth={5}
        className="size-7">
        <p
          className="font-mono text-xs font-medium tabular-nums"
          style={{ color: textColor }}>
          {averageScore}
        </p>
      </ProgressCircle>
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
      {item.stacked && (
        <>
          {item.size > 2 && (
            <div className="absolute left-2 top-2 h-full w-[97.5%] rounded-lg border bg-card transition-all group-hover:border-neutral-400 dark:group-hover:border-neutral-600"></div>
          )}
          <div className="absolute left-1 top-1 h-full w-[99%] rounded-lg border bg-card transition-all group-hover:border-neutral-400 dark:group-hover:border-neutral-600"></div>
        </>
      )}

      <Card
        renderAsLink
        className="duration-250 relative cursor-default transition-all group-hover:border-neutral-400 dark:group-hover:border-neutral-600"
        onClick={onResultItemClick({ item, query, updateQuery })}>
        <CardHeader className="relative flex w-full max-w-full flex-wrap items-baseline justify-between gap-3 px-3 py-2 md:flex-row">
          <div className="flex flex-col flex-wrap items-baseline gap-3 md:flex-row">
            {item.version && (
              <DataBadge
                variant="mono"
                classNames={{
                  wrapperClassName: 'md:-ml-1',
                  contentClassName: 'pt-0.5',
                }}
                tooltip={{ content: item.version }}
                content={item.version}
              />
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger className="grow cursor-default items-baseline justify-between overflow-hidden truncate text-left text-sm font-medium">
                  {item.title}
                </TooltipTrigger>
                <TooltipContent>{item.title}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="flex flex-row flex-wrap items-center gap-3">
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
                classNames={{
                  wrapperClassName: 'h-[30px]',
                }}
              />
            )}
            <PackageOverallScore
              className="hidden md:flex"
              insights={insights}
            />
          </div>

          <div className="absolute -bottom-3.5 right-2.5 flex gap-2">
            {item.labels?.map(i => (
              <div key={i}>
                <Badge
                  className={cn(
                    labelClassNamesMap.get(i),
                    'h-[18px] rounded-full text-xxs font-normal text-inherit backdrop-blur-md',
                  )}>
                  {i}
                </Badge>
              </div>
            ))}
          </div>

          <PackageOverallScore
            className="absolute right-2 top-2 flex md:hidden"
            insights={insights}
          />
        </CardHeader>
      </Card>
    </div>
  )
}
