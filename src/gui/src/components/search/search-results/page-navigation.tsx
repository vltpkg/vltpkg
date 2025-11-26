import { Fragment } from 'react'
import { cn } from '@/lib/utils.ts'
import { useSearchResultsStore } from '@/state/search-results.ts'
import {
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
} from 'lucide-react'

import type { ComponentProps } from 'react'

export const SearchResultsPaginationNavigation = ({
  className,
}: ComponentProps<typeof Pagination>) => {
  const page = useSearchResultsStore(state => state.page)
  const setPage = useSearchResultsStore(state => state.setPage)
  const total = useSearchResultsStore(state => state.total)
  const pageSize = useSearchResultsStore(state => state.pageSize)
  const results = useSearchResultsStore(state => state.results)

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const handleSetPage = (p: number) => {
    const clampedPage = Math.max(1, Math.min(p, totalPages))
    setPage(clampedPage)
    window.scrollTo(0, 0)
  }

  // Calculate visible pages with sliding window
  const getVisiblePages = () => {
    const maxVisible = 6
    const pages: number[] = []

    if (totalPages <= maxVisible) {
      // Show all pages if total is less than max
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Sliding window logic
      const halfVisible = Math.floor(maxVisible / 2)
      let start = Math.max(1, page - halfVisible)
      const end = Math.min(totalPages, start + maxVisible - 1)

      // Adjust start if we're near the end
      if (end - start < maxVisible - 1) {
        start = Math.max(1, end - maxVisible + 1)
      }

      for (let i = start; i <= end; i++) {
        pages.push(i)
      }
    }

    return pages
  }

  const visiblePages = getVisiblePages()
  const showStartEllipsis = (visiblePages[0] ?? 1) > 1
  const showEndEllipsis =
    (visiblePages[visiblePages.length - 1] ?? totalPages) < totalPages

  return (
    <Pagination className={cn('', className)}>
      <PaginationContent
        className={cn(
          'grid grid-cols-8 gap-[1px] rounded transition-transform duration-100 xl:grid-cols-10',
          '**:data-[slot=pagination-link]:h-12',
          results.length == 7 && 'flex justify-between',
          totalPages < 7 && 'flex justify-between',
          showStartEllipsis &&
            showEndEllipsis &&
            'grid-cols-10 xl:grid-cols-12',
        )}>
        <PaginationDirection
          className="max-xl:col-span-full"
          direction="previous"
          disabled={page === 1}
          onClick={() => handleSetPage(page - 1)}
        />
        {showStartEllipsis && (
          <Fragment>
            <PaginationItem>
              <PaginationLink onClick={() => handleSetPage(1)}>
                1
              </PaginationLink>
            </PaginationItem>
            <PaginationEllipses />
          </Fragment>
        )}
        {results.length > 0 &&
          visiblePages.map(p => (
            <PaginationItem key={p}>
              <PaginationLink
                onClick={() => handleSetPage(p)}
                isActive={page === p}>
                {p}
              </PaginationLink>
            </PaginationItem>
          ))}
        {showEndEllipsis && (
          <Fragment>
            <PaginationEllipses />
            <PaginationItem>
              <PaginationLink
                onClick={() => handleSetPage(totalPages)}>
                {totalPages}
              </PaginationLink>
            </PaginationItem>
          </Fragment>
        )}
        <PaginationDirection
          className="max-xl:col-span-full"
          direction="next"
          onClick={() => handleSetPage(page + 1)}
          disabled={page === totalPages}
        />
      </PaginationContent>
    </Pagination>
  )
}

const Pagination = ({
  className,
  ...props
}: ComponentProps<'nav'>) => {
  return (
    <nav
      data-slot="pagination"
      className={cn('', className)}
      {...props}
    />
  )
}

const PaginationContent = ({
  className,
  ...props
}: ComponentProps<'ul'>) => {
  return (
    <ul
      data-slot="pagination-content"
      className={cn('', className)}
      {...props}
    />
  )
}

const PaginationEllipses = ({
  className,
  ...props
}: ComponentProps<typeof PaginationItem>) => {
  return (
    <PaginationItem
      data-slot="pagination-ellipses"
      aria-hidden
      className={cn('**:data-[slot=ellipses]:size-3', className)}
      {...props}>
      <MoreHorizontal data-slot="ellipses" />
      <span className="sr-only">More pages</span>
    </PaginationItem>
  )
}

const PaginationDirection = ({
  disabled,
  direction,
  className,
  ...props
}: ComponentProps<typeof PaginationLink> & {
  direction: 'next' | 'previous'
}) => {
  return (
    <PaginationItem className={className}>
      <PaginationLink
        disabled={disabled}
        aria-label={`Go to ${direction} page`}
        className={cn(
          'inline-flex items-center gap-1 [&_svg]:shrink-0',
          '**:data-[slot=icon]:size-4 **:data-[slot=icon]:transition-transform **:data-[slot=icon]:duration-100',
          direction === 'next' &&
            'hover:**:data-[slot=icon]:translate-x-1',
          direction === 'previous' &&
            'hover:**:data-[slot=icon]:-translate-x-1',
        )}
        {...props}>
        {direction === 'previous' && <ChevronLeft data-slot="icon" />}
        <span className="capitalize">{direction}</span>
        {direction === 'next' && <ChevronRight data-slot="icon" />}
      </PaginationLink>
    </PaginationItem>
  )
}

const PaginationItem = ({
  className,
  ...props
}: React.ComponentProps<'li'>) => {
  return (
    <li
      data-slot="pagination-item"
      className={cn(
        'text-muted-foreground bg-background flex h-full w-full items-center justify-center rounded text-sm font-medium',
        className,
      )}
      {...props}
    />
  )
}

interface PaginationLinkProps extends ComponentProps<'a'> {
  isActive?: boolean
  disabled?: boolean
}

const PaginationLink = ({
  className,
  disabled,
  isActive,
  children,
  ...props
}: PaginationLinkProps) => {
  const isPageNumber = typeof children === 'number'

  return (
    <a
      aria-label={
        isPageNumber ? `Page link for ${children}` : 'Page link'
      }
      data-slot="pagination-link"
      className={cn(
        'hover:text-foreground hover:bg-foreground/6 inline-flex h-full w-full cursor-pointer items-center justify-center rounded p-3 transition-[color,transform] duration-100',
        disabled && 'cursor-not-allowed opacity-50',
        isPageNumber && 'font-mono tabular-nums',
        isActive && 'bg-foreground/10 text-foreground',
        className,
      )}
      {...props}>
      {isPageNumber ? children.toLocaleString() : children}
    </a>
  )
}
