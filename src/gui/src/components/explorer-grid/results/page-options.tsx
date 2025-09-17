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
import { useResultsStore } from '@/components/explorer-grid/results/context.tsx'
import { cn } from '@/lib/utils.ts'

export const PAGE_SIZE_OPTIONS = [25, 50, 75, 100] as const

export type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number]

interface ResultPageOptionsProps {
  label?: string
  className?: string
}

export const ResultPageOptions = ({
  label = 'Showing',
  className,
}: ResultPageOptionsProps) => {
  const pageSize = useResultsStore(state => state.pageSize)
  const setPageSize = useResultsStore(state => state.setPageSize)

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
            'w-fit rounded-xl border border-neutral-200 bg-white hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900 [&_svg]:data-[state=open]:-rotate-90',
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
          <DropdownMenuLabel className="text-sm text-muted-foreground">
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
