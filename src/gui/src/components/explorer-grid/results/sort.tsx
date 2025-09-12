import { Button } from '@/components/ui/button.tsx'
import {
  ChevronRight,
  Check,
  ArrowDownNarrowWide,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu.tsx'
import { useResultsStore } from '@/components/explorer-grid/results/context.tsx'

const sortOptions = [
  {
    label: 'Alphabetical',
    key: 'alphabetical' as const,
  },
  {
    label: 'Version',
    key: 'version' as const,
  },
  {
    label: 'Dependency type',
    key: 'dependencyType' as const,
  },
  {
    label: 'Dependents',
    key: 'dependents' as const,
  },
  {
    label: 'Module type',
    key: 'moduleType' as const,
  },
  {
    label: 'Overall score',
    key: 'overallScore' as const,
  },
]

export const ResultsSort = () => {
  const sortBy = useResultsStore(state => state.sortBy)
  const setSortBy = useResultsStore(state => state.setSortBy)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="max-h-8 gap-3 rounded-xl text-sm [&>.chevron]:data-[state=open]:rotate-90 [&_svg]:text-muted-foreground">
          <ArrowDownNarrowWide />
          <span>Sort</span>
          <ChevronRight className="chevron transition-transform duration-150" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="rounded-xl shadow-none"
        onCloseAutoFocus={e => e.preventDefault()}>
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-sm text-muted-foreground">
            Sort by
          </DropdownMenuLabel>
          {sortOptions.map((o, idx) => (
            <DropdownMenuItem
              key={`${o.label}-${idx}`}
              onSelect={e => e.preventDefault()}
              onClick={() => setSortBy(o.key)}
              className="rounded-lg">
              <div className="size-4">
                {sortBy === o.key && <Check className="size-3" />}
              </div>
              <span>{o.label}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
