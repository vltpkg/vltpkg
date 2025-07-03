import React, { useMemo, useState } from 'react'
import { useGraphStore } from '@/state/index.ts'
import { QueryToken } from '@/components/query-bar/query-token.tsx'
import { Query } from '@vltpkg/query'
import { cn } from '@/lib/utils.ts'
import { parseBreadcrumb } from '@vltpkg/dss-breadcrumb'
import { ChevronRight, Ellipsis } from 'lucide-react'

import type { GridItemData } from '@/components/explorer-grid/types.ts'
import type { ParsedSelectorToken } from '@vltpkg/query'
import type { State } from '@/state/types'

interface CrumbNavProps {
  className?: string
  breadcrumbs: GridItemData['breadcrumbs']
}

interface CrumbProps {
  query: string
  crumbIdx: number
  crumbLength: number
}

const MAX_BREADCRUMBS = 5
const TRUNCATED_TAIL_COUNT = 3

export const getBreadcrumbs = (
  query: State['query'],
): GridItemData['breadcrumbs'] | undefined => {
  try {
    const breadcrumb = parseBreadcrumb(query)

    if (breadcrumb.single && breadcrumb.first.value === ':root') {
      return undefined
    }

    return breadcrumb
  } catch (_e) {
    return undefined
  }
}

const Crumb = ({ query, crumbIdx, crumbLength }: CrumbProps) => {
  const parsedTokens = useMemo<ParsedSelectorToken[]>(() => {
    try {
      return Query.getQueryTokens(query)
    } catch (_e) {
      return []
    }
  }, [query])

  return parsedTokens.map((segment, idx) => (
    <QueryToken
      className={cn(
        'px-1.5',
        crumbIdx !== crumbLength - 1 &&
          'duration-250 opacity-75 transition-opacity hover:opacity-100',
      )}
      variant={segment.type}
      key={`crumb-${idx}`}>
      {segment.token}
    </QueryToken>
  ))
}

interface EllipsisButtonProps {
  onClick: () => void
  className?: string
}

const EllipsisButton = ({
  onClick,
  className,
}: EllipsisButtonProps) => (
  <button
    onClick={onClick}
    className={cn(
      'inline-flex items-center justify-center rounded px-1 py-0.5',
      'text-muted-foreground opacity-75 transition-opacity hover:opacity-100',
      'hover:bg-muted/50',
      className,
    )}
    aria-label="Show hidden breadcrumbs">
    <Ellipsis size={14} />
  </button>
)

export const CrumbNav = ({
  breadcrumbs,
  className,
}: CrumbNavProps) => {
  const updateQuery = useGraphStore(state => state.updateQuery)
  const [isExpanded, setIsExpanded] = useState(false)

  if (!breadcrumbs) return null

  const parts = [...breadcrumbs]
  const shouldTruncate = parts.length > MAX_BREADCRUMBS && !isExpanded

  const onCrumbClick = (crumbIndex: number) => {
    const constructedCrumbPath = parts
      .slice(0, crumbIndex + 1)
      .map(i => i.value)
      .join('>')
    updateQuery(constructedCrumbPath)
  }

  const onEllipsisClick = () => {
    setIsExpanded(!isExpanded)
  }

  const getVisibleBreadcrumbs = () => {
    if (!shouldTruncate) {
      return parts.map((part, index) => ({
        part,
        originalIndex: index,
      }))
    }

    if (parts.length === 0) return []

    const firstPart = parts[0]
    if (!firstPart) return []

    const first = [{ part: firstPart, originalIndex: 0 }]
    const startIndex = Math.max(
      0,
      parts.length - TRUNCATED_TAIL_COUNT,
    )
    const last = parts.slice(startIndex).map((part, index) => ({
      part,
      originalIndex: startIndex + index,
    }))

    return [...first, ...last]
  }

  const visibleBreadcrumbs = getVisibleBreadcrumbs()

  return (
    <nav
      className={cn('flex flex-row items-center gap-1', className)}>
      {visibleBreadcrumbs.map(
        ({ part, originalIndex }, displayIndex) => (
          <React.Fragment key={`part-${originalIndex}`}>
            {shouldTruncate && displayIndex === 1 && (
              <>
                <ChevronRight
                  size={14}
                  strokeWidth={2}
                  className="text-muted-foreground opacity-75"
                />
                <EllipsisButton onClick={onEllipsisClick} />
              </>
            )}

            {displayIndex > 0 &&
              !(shouldTruncate && displayIndex === 1) && (
                <ChevronRight
                  size={14}
                  strokeWidth={2}
                  className="text-muted-foreground opacity-75"
                />
              )}

            <button
              className="inline-flex"
              onClick={() => onCrumbClick(originalIndex)}>
              <Crumb
                crumbLength={parts.length}
                crumbIdx={originalIndex}
                query={part.name ? `#${part.name}` : part.value}
              />
            </button>
          </React.Fragment>
        ),
      )}
    </nav>
  )
}
