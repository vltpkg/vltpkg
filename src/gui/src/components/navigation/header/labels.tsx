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
    <div className="flex w-full justify-between gap-5">
      <FilterSearch
        placeholder="Filter Labels"
        items={savedLabels}
        setFilteredItems={setFilteredLabels}
        className="grow"
      />
      <SortToggle
        filteredItems={filteredLabels}
        setFilteredItems={setFilteredLabels}
        sortKey="name"
        classNames={{
          toggleClassName: 'rounded-xl',
          sliderClassName: 'rounded-[9px]',
          optionClassName: 'rounded-lg',
        }}
      />
      <DeleteLabel
        deleteDialogOpen={deleteDialogOpen}
        setDeleteDialogOpen={setDeleteDialogOpen}
        selectedLabels={selectedLabels}
        className="rounded-xl"
      />
      {savedLabels?.length !== 0 && (
        <Button
          disabled={isCreating}
          onClick={() => setIsCreating(true)}
          className="rounded-xl">
          <span className="hidden md:flex">New Label</span>
          <Plus />
        </Button>
      )}
    </div>
  )
}
