import { Fragment, useEffect, useState } from 'react'
import { stringifyNode } from '@vltpkg/graph/browser'
import { useGraphStore } from '@/state/index.ts'
import { ArrowRight, Blocks, Dot, EyeOff, Scale } from 'lucide-react'
import {
  getScoreColor,
  scoreColors,
} from '@/components/explorer-grid/selected-item/insight-score-helper.ts'
import { RelationBadge } from '@/components/ui/relation-badge.tsx'
import { ProgressCircle } from '@/components/ui/progress-circle.tsx'
import { getPackageShortName } from '@/utils/get-package-shortname.ts'
import { retrieveAvatar } from '@/lib/external-info.ts'
import { updateResultItem } from '@/lib/update-result-item.ts'
import { getPackageIcon } from '@/utils/get-package-icon.ts'
import { getRepositoryUrl } from '@/utils/get-repo-url.ts'

import type { Insights } from '@vltpkg/query'
import type { GridItemData } from '@/components/explorer-grid/types.ts'
import type { ProgressCircleVariant } from '@/components/ui/progress-circle.tsx'

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

interface ResultItemProps {
  item: GridItemData
}

export const ResultItem = ({ item }: ResultItemProps) => {
  const query = useGraphStore(state => state.query)
  const updateQuery = useGraphStore(state => state.updateQuery)
  const [authorAvatar, setAuthorAvatar] = useState<string | null>(
    null,
  )

  const fetchAuthorAvatar = async (email: string) => {
    return await retrieveAvatar(email)
  }

  const itemName =
    item.depName && item.depName !== item.name ?
      item.depName
    : item.name

  useEffect(() => {
    if (item.to?.manifest?.author?.email) {
      void fetchAuthorAvatar(item.to.manifest.author.email).then(
        setAuthorAvatar,
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const packageShortName = getPackageShortName(item.name)
  const repoUrl =
    item.to?.manifest?.repository ?
      getRepositoryUrl(item.to.manifest.repository)
    : undefined

  const packageIcon = repoUrl ? getPackageIcon(repoUrl) : undefined

  const authorNameShort =
    item.to?.manifest?.author?.name ?
      item.to.manifest.author.name.substring(0, 2)
    : '?'

  const itemVersion =
    item.to?.version || item.spec?.bareSpec || undefined

  return (
    <div
      role="link"
      aria-label={`Update query to: ${item.name}`}
      onClick={updateResultItem({ item, query, updateQuery })}
      className="flex h-fit w-full cursor-pointer flex-col gap-2">
      {/* item header */}
      <div className="flex flex-col items-start justify-between md:flex-row md:items-center">
        <div className="flex items-center gap-2">
          <div className="relative size-6 rounded-md border">
            {packageIcon?.src ?
              <img
                aria-label="Package image"
                src={packageIcon.src}
                alt={packageIcon.alt}
                className="absolute inset-0 size-full rounded-md object-cover"
              />
            : <div className="absolute inset-0 flex aspect-square items-center justify-center rounded-[calc(0.375rem+1px)] bg-linear-to-tr from-neutral-300 to-neutral-100 dark:from-neutral-900 dark:to-neutral-700">
                <span className="bg-linear-to-tr from-neutral-500 to-neutral-900 bg-clip-text text-sm text-transparent empty:hidden dark:from-neutral-400 dark:to-neutral-100">
                  {packageShortName}
                </span>
              </div>
            }
          </div>
          <div className="inline-flex items-baseline">
            <h3 className="text-lg font-medium tracking-tight">
              {itemName}
            </h3>

            <div className="text-muted-foreground ml-3 inline-flex items-baseline gap-1 font-mono text-sm font-medium tabular-nums">
              {/* if the resolved version is not the same as the spec, show the reason */}
              {item.spec?.bareSpec !== itemVersion ?
                <Fragment>
                  <span>{item.spec?.bareSpec}</span>
                  <ArrowRight className="size-2.5" />
                  <span className="text-foreground">
                    {itemVersion}
                  </span>
                </Fragment>
              : <span>{itemVersion}</span>}
            </div>
          </div>
        </div>
        {/* resolved spec + score */}
        <div className="flex items-center gap-2">
          <div className="bg-background flex items-center justify-center rounded-lg border px-2 py-1">
            <span className="text-muted-foreground text-sm">
              {item.version}
            </span>
          </div>
          {item.to?.insights && (
            <div className="flex items-center justify-center empty:hidden">
              <PackageOverallScore insights={item.to.insights} />
            </div>
          )}
        </div>
      </div>

      {/* description */}
      {item.to?.manifest?.description && (
        <p className="text-foreground text-sm">
          {item.to.manifest.description}
        </p>
      )}

      {/* metadata */}
      <div className="**:data-[slot=delimiter]:text-muted-foreground flex flex-wrap items-center gap-1 **:data-[slot=delimiter]:size-5">
        {item.to?.manifest?.author && (
          <Fragment>
            <div className="flex items-center gap-1">
              {authorAvatar ?
                <div className="relative size-4 rounded border">
                  <img
                    src={authorAvatar}
                    className="absolute inset-0 size-full rounded object-cover"
                  />
                </div>
              : <div className="flex aspect-square size-4 items-center justify-center rounded border bg-gradient-to-tr from-neutral-300 to-neutral-100 dark:from-neutral-900 dark:to-neutral-700">
                  <span className="bg-linear-to-tr from-neutral-500 to-neutral-900 bg-clip-text text-sm text-xs text-transparent empty:hidden dark:from-neutral-400 dark:to-neutral-100">
                    {authorNameShort}
                  </span>
                </div>
              }
              <p className="text-sm font-medium">
                {item.to.manifest.author.name}
              </p>
            </div>
            <Dot data-slot="delimiter" />
          </Fragment>
        )}
        {item.type && (
          <Fragment>
            <div className="text-muted-foreground flex items-center gap-1 text-sm font-medium">
              <span className="bg-background-secondary text-foreground rounded border px-2 font-mono empty:hidden">
                {item.stacked ? '' : item.type}
              </span>
              <p className="align-baseline">
                dep of:
                <span className="text-foreground ml-1">
                  {item.stacked ?
                    item.size
                  : stringifyNode(item.from)}
                </span>
              </p>
            </div>
          </Fragment>
        )}
        {item.to?.manifest?.private && (
          <Fragment>
            <Dot data-slot="delimiter" />
            <div className="flex items-center gap-1 text-sm font-medium text-red-500">
              <EyeOff className="size-3.5" />
              <p>Private Package</p>
            </div>
          </Fragment>
        )}
        {item.to?.manifest?.license && (
          <Fragment>
            <Dot data-slot="delimiter" />
            <div className="text-muted-foreground flex items-center gap-1 text-sm font-medium">
              <Scale className="size-3.5" />
              <p>{item.to.manifest.license}</p>
            </div>
          </Fragment>
        )}
        {item.to?.manifest?.type && (
          <Fragment>
            <Dot data-slot="delimiter" />
            <div className="text-muted-foreground mr-2 flex items-center gap-1 text-sm font-medium">
              <Blocks className="size-3.5" />
              <p>
                {item.to.manifest.type === 'module' ? 'ESM' : 'CJS'}
              </p>
            </div>
          </Fragment>
        )}
      </div>
      {/* relationships */}
      {item.labels && item.labels.length !== 0 && (
        <div className="flex w-full">
          <div className="flex items-center space-x-1">
            {item.labels.map(i => (
              <div key={i}>
                <RelationBadge relation={i}>{i}</RelationBadge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
