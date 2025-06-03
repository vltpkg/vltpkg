import { ResultItem } from '@/components/explorer-grid/results/result-item.tsx'
import type { GridItemData } from '@/components/explorer-grid/types.ts'
import { GridHeader } from '@/components/explorer-grid/header.tsx'
import { EmptyResultsState } from '@/components/explorer-grid/results/empty-results-state.tsx'
import { Badge } from '@/components/ui/badge.tsx'

export const Results = ({ items }: { items: GridItemData[] }) => {
  if (!items.length) {
    return <EmptyResultsState />
  }

  return (
    <div className="mt-8 grid w-full max-w-8xl gap-4">
      <div className="flex items-center gap-3">
        <GridHeader className="h-fit">Results</GridHeader>
        <Badge variant="default">{items.length}</Badge>
      </div>
      <div className="flex flex-col gap-5">
        {items.map(item => (
          <ResultItem item={item} key={item.id} />
        ))}
      </div>
    </div>
  )
}
