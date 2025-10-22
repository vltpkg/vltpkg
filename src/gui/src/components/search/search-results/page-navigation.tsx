import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
  PaginationEllipsis,
  PaginationLink,
  PaginationNext,
} from '@/components/ui/pagination.tsx'
import { cn } from '@/lib/utils.ts'
import { useSearchResultsStore } from '@/state/search-results.ts'

interface SearchResultsPaginationNavigationProps {
  className?: string
}

export const SearchResultsPaginationNavigation = ({
  className,
}: SearchResultsPaginationNavigationProps) => {
  const page = useSearchResultsStore(state => state.page)
  const setPage = useSearchResultsStore(state => state.setPage)
  const total = useSearchResultsStore(state => state.total)
  const pageSize = useSearchResultsStore(state => state.pageSize)

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const handleSetPage = (p: number) => {
    const clampedPage = Math.max(1, Math.min(p, totalPages))
    setPage(clampedPage)
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
    <Pagination className={cn(className)}>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            onClick={() => handleSetPage(page - 1)}
            disabled={page <= 1}
          />
        </PaginationItem>
        {showStartEllipsis && (
          <>
            <PaginationItem>
              <PaginationLink
                isActive={1 === page}
                onClick={() => handleSetPage(1)}>
                1
              </PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
          </>
        )}
        {visiblePages.map(p => (
          <PaginationItem key={p}>
            <PaginationLink
              isActive={p === page}
              onClick={() => handleSetPage(p)}>
              {p}
            </PaginationLink>
          </PaginationItem>
        ))}
        {showEndEllipsis && (
          <>
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
            <PaginationItem>
              <PaginationLink
                isActive={totalPages === page}
                onClick={() => handleSetPage(totalPages)}>
                {totalPages}
              </PaginationLink>
            </PaginationItem>
          </>
        )}
        <PaginationItem>
          <PaginationNext
            onClick={() => handleSetPage(page + 1)}
            disabled={page >= totalPages}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}
