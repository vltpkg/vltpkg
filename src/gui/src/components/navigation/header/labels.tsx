import { Button } from '@/components/ui/button.tsx'
import { Plus } from 'lucide-react'
import { FilterSearch } from '@/components/ui/filter-search.tsx'
import { DeleteLabel } from '@/components/labels/delete-label.tsx'
import { SortToggle } from '@/components/sort-toggle.tsx'
import { useLabelsStore } from '@/state/labels.ts'
import { useGraphStore } from '@/state/index.ts'

export const LabelsHeader = () => {
  const savedLabels = useGraphStore(state => state.savedQueryLabels)
  const selectedLabels = useLabelsStore(state => state.selectedLabels)
  const isCreating = useLabelsStore(state => state.isCreating)
  const setIsCreating = useLabelsStore(state => state.setIsCreating)
  const deleteDialogOpen = useLabelsStore(
    state => state.deleteDialogOpen,
  )
  const setDeleteDialogOpen = useLabelsStore(
    state => state.setDeleteDialogOpen,
  )
  const setFilteredLabels = useLabelsStore(
    state => state.setFilteredLabels,
  )
  const filteredLabels = useLabelsStore(state => state.filteredLabels)

  return (
    <div className="flex justify-between gap-2">
      <div className="flex gap-2">
        <FilterSearch
          placeholder="Filter Labels"
          items={savedLabels}
          setFilteredItems={setFilteredLabels}
        />
        <SortToggle
          filteredItems={filteredLabels}
          setFilteredItems={setFilteredLabels}
          sortKey="name"
        />
        <DeleteLabel
          deleteDialogOpen={deleteDialogOpen}
          setDeleteDialogOpen={setDeleteDialogOpen}
          selectedLabels={selectedLabels}
        />
      </div>
      <div>
        {savedLabels?.length !== 0 && (
          <Button
            disabled={isCreating}
            onClick={() => setIsCreating(true)}>
            <span>New Label</span>
            <Plus />
          </Button>
        )}
      </div>
    </div>
  )
}
