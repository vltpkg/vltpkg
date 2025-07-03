import { useEffect } from 'react'
import { Label } from '@/components/labels/label.tsx'
import { sortAlphabeticallyAscending } from '@/components/sort-toggle.tsx'
import { Checkbox } from '@/components/ui/checkbox.tsx'
import { CreateLabel } from '@/components/labels/create-label.tsx'
import { useGraphStore } from '@/state/index.ts'
import { LabelsEmptyState } from '@/components/labels/labels-empty-state.tsx'
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion'
import { useLabelsStore } from '@/state/labels.ts'

import type { QueryLabel } from '@/state/types.ts'

const Labels = () => {
  const savedLabels = useGraphStore(state => state.savedQueryLabels)

  const selectedLabels = useLabelsStore(state => state.selectedLabels)
  const setSelectedLabels = useLabelsStore(
    state => state.setSelectedLabels,
  )
  const isCreating = useLabelsStore(state => state.isCreating)
  const setIsCreating = useLabelsStore(state => state.setIsCreating)
  const setFilteredLabels = useLabelsStore(
    state => state.setFilteredLabels,
  )
  const filteredLabels = useLabelsStore(state => state.filteredLabels)

  const handleSelectLabel = (selectedLabel: QueryLabel) => {
    const isSelected = selectedLabels.some(
      label => label.id === selectedLabel.id,
    )
    const newSelection =
      isSelected ?
        selectedLabels.filter(query => query.id !== selectedLabel.id)
      : [...selectedLabels, selectedLabel]
    setSelectedLabels(newSelection)
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
  }, [savedLabels, setFilteredLabels])

  return (
    <section className="flex h-full w-full flex-col px-8">
      <div className="flex w-full max-w-8xl flex-col">
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
