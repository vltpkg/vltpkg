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
import { useResultsStore } from '@/components/explorer-grid/results/context.tsx'

interface ResultsPaginationNavigationProps {
  className?: string
}

export const ResultsPaginationNavigation = ({
  className,
}: ResultsPaginationNavigationProps) => {
  const page = useResultsStore(state => state.page)
  const setPage = useResultsStore(state => state.setPage)
  const totalPages = useResultsStore(state => state.totalPages)

  const handleSetPage = (p: number) => {
    setPage(p)
  }

  const pages = Array.from(
    { length: totalPages },
    (_, i) => i + 1,
  ).slice(0, 6)

  return (
    <Pagination className={cn(className)}>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            onClick={() => handleSetPage(page - 1)}
          />
        </PaginationItem>
        {pages.map(p => (
          <PaginationItem key={p}>
            <PaginationLink
              size="icon"
              isActive={p === page}
              onClick={() => handleSetPage(p)}>
              {p}
            </PaginationLink>
          </PaginationItem>
        ))}
        {totalPages > pages.length && (
          <>
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
            <PaginationItem>
              <PaginationLink
                size="icon"
                onClick={() => handleSetPage(totalPages)}>
                {totalPages}
              </PaginationLink>
            </PaginationItem>
          </>
        )}
        <PaginationItem>
          <PaginationNext onClick={() => handleSetPage(page + 1)} />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}
