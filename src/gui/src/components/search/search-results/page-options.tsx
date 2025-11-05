import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuContent,
} from '@/components/ui/dropdown-menu.tsx'
import { ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button.tsx'
import { cn } from '@/lib/utils.ts'
import { useSearchResultsStore } from '@/state/search-results.ts'
import { PAGE_SIZE_OPTIONS } from '@/components/explorer-grid/results/page-options.tsx'

import type { PageSizeOption } from '@/components/explorer-grid/results/page-options'

interface SearchResultPageOptionsProps {
  label?: string
  className?: string
}

export const SearchResultPageOptions = ({
  label = 'Showing',
  className,
}: SearchResultPageOptionsProps) => {
  const pageSize = useSearchResultsStore(state => state.pageSize)
  const setPageSize = useSearchResultsStore(
    state => state.setPageSize,
  )

  const handleSetPageSize = (ps: number) => {
    setPageSize(ps as PageSizeOption)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'h-8 w-fit rounded-xl border border-neutral-200 bg-white hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900 [&_svg]:data-[state=open]:-rotate-90',
            className,
          )}>
          <span>{`${label} ${pageSize}`}</span>
          <ChevronRight className="chevron text-neutral-500 transition-transform duration-150" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="rounded-xl shadow-none"
        onCloseAutoFocus={e => e.preventDefault()}>
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-muted-foreground text-sm">
            Results per page
          </DropdownMenuLabel>
          {PAGE_SIZE_OPTIONS.map(size => (
            <DropdownMenuItem
              key={`page-size-${size}`}
              className="rounded-lg"
              onClick={() => handleSetPageSize(size)}>
              {size}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
