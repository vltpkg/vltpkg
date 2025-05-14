import { ResultItem } from '@/components/explorer-grid/result-item.tsx'
import type { GridItemData } from '@/components/explorer-grid/types.ts'
import { GridHeader } from '@/components/explorer-grid/header.tsx'
import { EmptyResultsState } from '@/components/explorer-grid/empty-results-state.tsx'
import { Badge } from '@/components/ui/badge.tsx'

export const GridResults = ({ items }: { items: GridItemData[] }) => {
  if (!items.length) {
    return <EmptyResultsState />
  }

  return (
    <div className="grid w-full max-w-8xl grid-cols-8 gap-4">
      <div className="col-span-2"></div>
      <div className="col-span-4">
        <div className="flex items-center gap-3">
          <GridHeader className="mb-4">Results</GridHeader>
          <Badge className="mt-2" variant="default">
            {items.length}
          </Badge>
        </div>
        <div className="flex flex-col gap-6">
          {items.map(item => (
            <ResultItem item={item} key={item.id} />
          ))}
        </div>
      </div>
      <div className="col-span-2"></div>
    </div>
  )
}
