import { useEffect, useState } from 'react'
import { Label } from '@/components/labels/label.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Plus } from 'lucide-react'
import { FilterSearch } from '@/components/ui/filter-search.tsx'
import {
  sortAlphabeticallyAscending,
  SortToggle,
} from '@/components/sort-toggle.tsx'
import { Checkbox } from '@/components/ui/checkbox.tsx'
import { DeleteLabel } from '@/components/labels/delete-label.tsx'
import { CreateLabel } from '@/components/labels/create-label.tsx'
import type { QueryLabel } from '@/state/types.ts'
import { useGraphStore } from '@/state/index.ts'
import { LabelsEmptyState } from '@/components/labels/labels-empty-state.tsx'
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion'

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
    <section className="flex h-full max-h-[calc(100svh-65px-16px)] w-full flex-col overflow-y-scroll rounded-b-lg border-x-[1px] border-b-[1px] px-8">
      <div className="flex w-full max-w-8xl flex-col">
        <div className="mb-4 flex justify-between pt-1">
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

        <LayoutGroup>
          <AnimatePresence mode="popLayout" initial={false}>
            {isCreating && (
              <motion.div
                layout="preserve-aspect"
                key="create-label"
                initial={{ height: 0, opacity: 0, scale: 0.8 }}
                animate={{ height: 'auto', opacity: 1, scale: 1 }}
                transition={{
                  duration: 0.75,
                  ease: [0.16, 1, 0.3, 1],
                }}
                exit={{ height: 0, opacity: 0, scale: 0.8 }}
                className="mt-6">
                <CreateLabel
                  closeCreate={() => setIsCreating(false)}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div layout="position" className="mt-6">
            {!!savedLabels?.length && (
              <motion.div
                initial={{ opacity: 1 }}
                animate={{ opacity: isCreating ? 0 : 1 }}
                exit={{ opacity: 1 }}
                transition={{
                  duration: 0.75,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="grid grid-cols-8 px-3">
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
              </motion.div>
            )}

            <div className="mt-3 flex h-full flex-col gap-3">
              {savedLabels &&
                filteredLabels.map(label => (
                  <Label
                    checked={selectedLabels.some(
                      selected => selected.id === label.id,
                    )}
                    handleSelect={handleSelectLabel}
                    queryLabel={label}
                    key={label.id}
                  />
                ))}
            </div>
          </motion.div>
        </LayoutGroup>
      </div>

      {!savedLabels?.length && <LabelsEmptyState />}
    </section>
  )
}

export { Labels }
