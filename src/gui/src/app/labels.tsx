import { useEffect, useState } from 'react'
import { Label } from '@/components/labels/label.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Plus } from 'lucide-react'
import { FilterSearch } from '@/components/ui/filter-search.jsx'
import {
  sortAlphabeticallyAscending,
  SortToggle,
} from '@/components/sort-toggle.jsx'
import { Checkbox } from '@/components/ui/checkbox.jsx'
import { DeleteLabel } from '@/components/labels/delete-label.jsx'
import { CreateLabel } from '@/components/labels/create-label.jsx'
import { type QueryLabel } from '@/state/types.js'
import { useGraphStore } from '@/state/index.js'
import { LabelsEmptyState } from '@/components/labels/labels-empty-state.jsx'

const Labels = () => {
  const [deleteDialogOpen, setDeleteDialogOpen] =
    useState<boolean>(false)
  const [isCreating, setIsCreating] = useState<boolean>(false)
  const [filteredLabels, setFilteredLabels] = useState<QueryLabel[]>(
    [],
  )
  const [selectedLabels, setSelectedLabels] = useState<QueryLabel[]>(
    [],
  )
  const savedLabels = useGraphStore(state => state.savedQueryLabels)

  const handleSelectLabel = (selectedLabel: QueryLabel) => {
    setSelectedLabels(prev => {
      const isSelected = prev.some(
        label => label.id === selectedLabel.id,
      )
      return isSelected ?
          prev.filter(query => query.id !== selectedLabel.id)
        : [...prev, selectedLabel]
    })
  }

  const handleSelectAll = () => {
    if (filteredLabels.length === selectedLabels.length) {
      setSelectedLabels([])
    } else {
      setSelectedLabels(filteredLabels)
    }
  }

  useEffect(() => {
    if (savedLabels) {
      sortAlphabeticallyAscending(
        savedLabels,
        'name',
        setFilteredLabels,
      )
    }
  }, [savedLabels])

  return (
    <section className="flex min-h-[80svh] w-full grow flex-col bg-white dark:bg-black">
      <div className="flex flex-col px-8 py-4">
        <div className="flex justify-between">
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

        {isCreating && (
          <div className="mt-6">
            <CreateLabel closeCreate={() => setIsCreating(false)} />
          </div>
        )}

        {!!savedLabels?.length && (
          <div className="mt-6 grid grid-cols-8 px-3">
            <div className="col-span-2 flex items-center gap-3">
              <Checkbox
                onCheckedChange={handleSelectAll}
                className="border-muted-foreground/50 hover:border-muted-foreground/75"
              />
              <p className="text-sm font-medium text-neutral-500">
                Name
              </p>
            </div>
            <div className="col-span-4 flex items-center">
              <p className="text-sm font-medium text-neutral-500">
                Description
              </p>
            </div>
            <div className="flex items-center justify-center">
              <p className="text-sm font-medium text-neutral-500">
                References
              </p>
            </div>
          </div>
        )}

        <div className="mt-3 flex flex-col gap-3">
          {savedLabels &&
            filteredLabels.map((label, idx) => (
              <Label
                checked={selectedLabels.some(
                  selected => selected.id === label.id,
                )}
                handleSelect={handleSelectLabel}
                queryLabel={label}
                key={idx}
              />
            ))}
        </div>
      </div>

      {!savedLabels?.length && <LabelsEmptyState />}
    </section>
  )
}

export { Labels }
