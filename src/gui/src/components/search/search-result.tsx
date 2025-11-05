import {
  format,
  differenceInDays,
  formatDistanceToNow,
} from 'date-fns'
import { forwardRef } from 'react'
import { useNavigate } from 'react-router'
import { cn } from '@/lib/utils.ts'
import { getPackageIcon } from '@/utils/get-package-icon.ts'
import { DataBadge } from '@/components/ui/data-badge.tsx'

import type { SearchObject } from '@/lib/package-search.ts'

interface SearchResultProps {
  item: SearchObject
  isSelected?: boolean
}

export const SearchResult = forwardRef<
  HTMLDivElement,
  SearchResultProps
>(({ item, isSelected = false }, ref) => {
  const { package: pkg } = item
  const navigate = useNavigate()
  const authorName = pkg.author?.name

  const getFormattedDate = () => {
    if (!pkg.date) return ''

    const publishDate = new Date(pkg.date)
    const daysDiff = differenceInDays(new Date(), publishDate)

    if (daysDiff < 14) {
      // Show relative time for recent packages (within 14 days)
      return `published ${formatDistanceToNow(publishDate, { addSuffix: false })} ago`
    } else {
      // Show regular date for older packages
      return format(publishDate, 'MMM d, yyyy')
    }
  }

  const formattedDate = getFormattedDate()
  const pkgIcon = getPackageIcon(pkg.links.repository)

  const handleClick = () => {
    void navigate(`/explore/npm/${encodeURIComponent(pkg.name)}`)
  }

  return (
    <div
      ref={ref}
      onClick={handleClick}
      className={cn(
        'group/item flex cursor-pointer flex-col gap-2 rounded-lg border border-transparent p-2 transition-colors',
        'hover:border-neutral-300 hover:dark:border-neutral-700',
        isSelected ?
          'ring-offset-0.5 bg-neutral-100 ring-1 ring-neutral-300 dark:bg-neutral-800 dark:ring-neutral-700'
        : 'hover:bg-neutral-100 hover:dark:bg-neutral-800',
      )}>
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center">
          {pkgIcon ?
            <div className="border-muted flex size-[64px] items-center justify-center rounded-lg border">
              <img
                src={pkgIcon.src}
                alt={pkgIcon.alt}
                className="size-[64px] rounded-lg object-cover"
              />
            </div>
          : <div className="flex size-[64px] items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 grayscale">
              <span className="text-lg font-bold text-white">
                {pkg.name.charAt(0).toUpperCase()}
              </span>
            </div>
          }
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-baseline gap-2">
            <h3 className="truncate text-lg font-semibold">
              {pkg.name}
            </h3>
            <span className="text-muted-foreground text-xs">
              v{pkg.version}
            </span>
          </div>
          <DataBadge
            variant="mono"
            content={`npm:${pkg.name}@${pkg.version}`}
            classNames={{
              wrapperClassName: 'h-7 truncate overflow-hidden',
            }}
            tooltip={{ content: `npm:${pkg.name}@${pkg.version}` }}
          />
          <div className="flex items-center gap-1.5">
            <p className="text-muted-foreground text-xs font-medium">
              by {authorName}
            </p>
            {formattedDate && (
              <>
                <span className="text-muted-foreground">•</span>
                <p className="text-muted-foreground text-xs font-medium">
                  {formattedDate}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
      {pkg.description && (
        <div className="flex flex-col">
          <p className="text-muted-foreground line-clamp-2 text-sm">
            {pkg.description}
          </p>
        </div>
      )}
      {pkg.keywords && pkg.keywords.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {pkg.keywords.slice(0, 5).map((keyword, idx) => (
            <span
              key={`${pkg.name}-keyword-${idx}`}
              className="text-muted-foreground dark:border-muted rounded-md border border-neutral-300 bg-neutral-200 px-2 py-0.5 text-xs transition-colors duration-100 group-hover/item:border-neutral-400 dark:bg-neutral-800 group-hover/item:dark:border-neutral-600 group-hover/item:dark:bg-neutral-700">
              {keyword}
            </span>
          ))}
        </div>
      )}
    </div>
  )
})

SearchResult.displayName = 'SearchResult'
