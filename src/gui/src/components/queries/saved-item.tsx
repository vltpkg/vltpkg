import { useEffect, useState } from 'react'
import {
  type SavedQuery,
  type Action,
  type QueryLabel,
} from '@/state/types.js'
import { useGraphStore } from '@/state/index.js'
import { Input } from '@/components/ui/input.jsx'
import { Button } from '@/components/ui/button.jsx'
import { useToast } from '@/components/hooks/use-toast.js'
import { Checkbox } from '@/components/ui/checkbox.jsx'
import { Label } from '@/components/ui/label.jsx'
import { LabelBadge } from '@/components/labels/label-badge.jsx'
import { ArrowRight, ChevronsUpDown } from 'lucide-react'
import { LabelSelect } from '@/components/labels/label-select.jsx'
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover.jsx'

type SelectQueryOptions = {
  updateActiveRoute: Action['updateActiveRoute']
  updateErrorCause: Action['updateErrorCause']
  updateQuery: Action['updateQuery']
  updateStamp: Action['updateStamp']
  item: SavedQuery
  context: string
}

// TODO: should reuse / share the project select logic from:
// src/gui/src/components/dashboard-grid/index.tsx
export const selectQuery = async ({
  updateActiveRoute,
  updateErrorCause,
  updateQuery,
  updateStamp,
  item,
  context,
}: SelectQueryOptions) => {
  let req
  try {
    req = await fetch('/select-project', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        path: context,
      }),
    })
  } catch (err) {
    console.error(err)
    updateActiveRoute('/error')
    updateErrorCause('Failed to request project selection.')
    return
  }

  let projectSelected = false
  try {
    projectSelected = (await req.json()) === 'ok'
  } catch (err) {
    console.error(err)
  }

  if (projectSelected) {
    window.scrollTo(0, 0)
    updateQuery(item.query)
    updateActiveRoute('/explore')
    updateStamp()
  } else {
    updateActiveRoute('/error')
    updateErrorCause('Failed to select project.')
  }
}

const SavedQueryItem = ({
  item,
  handleSelect,
  checked,
}: {
  item: SavedQuery
  handleSelect: (item: SavedQuery) => void
  checked: boolean
}) => {
  const { toast } = useToast()
  const [isExpanded, setIsExpanded] = useState<boolean>(false)
  const [editName, setEditName] = useState<string>('')
  const [editContext, setEditContext] = useState<string>('')
  const [_labelSelectOpen, setLabelSelectOpen] =
    useState<boolean>(false)
  const [popoverOpen, setPopoverOpen] = useState<boolean>(false)
  const [selectedLabels, setSelectedLabels] = useState<QueryLabel[]>(
    [],
  )
  const [editQuery, setEditQuery] = useState<string>('')
  const [isValid, setIsValid] = useState<boolean>(false)
  const updateSavedQuery = useGraphStore(
    state => state.updateSavedQuery,
  )
  const updateActiveRoute = useGraphStore(
    state => state.updateActiveRoute,
  )
  const updateErrorCause = useGraphStore(
    state => state.updateErrorCause,
  )
  const updateQuery = useGraphStore(state => state.updateQuery)
  const updateStamp = useGraphStore(state => state.updateStamp)

  useEffect(() => {
    setEditName(item.name)
    setEditContext(item.context)
    setEditQuery(item.query)
    setSelectedLabels(item.labels ?? [])
  }, [item])

  useEffect(() => {
    if (editName !== '' && editQuery !== '') {
      setIsValid(true)
    } else {
      setIsValid(false)
    }
  }, [editName, editContext, editQuery])

  const handleEdit = () => {
    setIsExpanded(!isExpanded)
  }

  const handleSaveChanges = () => {
    const updatedItem: SavedQuery = {
      ...item,
      name: editName,
      context: editContext,
      query: editQuery,
      dateModified: new Date().toISOString(),
      labels: selectedLabels,
    }
    updateSavedQuery(updatedItem)
    setIsExpanded(false)
    toast({
      title: `${editName} saved successfully`,
    })
  }

  const runQuery = async (): Promise<void> => {
    await selectQuery({
      updateActiveRoute,
      updateErrorCause,
      updateQuery,
      updateStamp,
      item,
      context: item.context,
    })
  }

  return (
    <div
      className={`bg-neutral-50 dark:bg-neutral-950 rounded-sm flex flex-col transition-all border border-[1px] hover:border-foreground/50 group ${isExpanded ? 'border-foreground/50' : 'border-muted-foreground/25 '}`}>
      <div className="grid grid-cols-12 gap-4 px-3 py-2">
        <div className="col-span-2 flex items-center gap-3 grow">
          <Checkbox
            checked={checked}
            onCheckedChange={() => handleSelect(item)}
            className="border-muted-foreground/25 group-hover:border-muted-foreground/50"
          />
          <p className="truncate text-sm font-medium">
            {editName.trim() !== '' ? editName : 'Query Name'}
          </p>
        </div>
        <div className="flex col-span-4 items-center">
          {!isExpanded && (
            <p className="text-sm w-[500px] truncate">{editQuery}</p>
          )}
        </div>
        <div className="flex col-span-2 items-center gap-2">
          <p className="text-sm truncate">{item.context}</p>
        </div>
        <div className="flex col-span-2 items-center gap-2">
          {selectedLabels.map((label, idx) => (
            <LabelBadge
              key={idx}
              name={label.name}
              color={label.color}
            />
          ))}
        </div>

        <div className="col-span-2 flex gap-4 items-center justify-end">
          <Button
            variant="outline"
            className="text-sm px-3 rounded-sm border border-[1px] border-muted-foreground/25 h-[2rem]"
            onClick={handleEdit}>
            {isExpanded ? 'Close' : 'Edit'}
          </Button>
          {editContext.trim() !== '' && (
            <Button
              variant="outline"
              className="text-sm px-3 rounded-sm border border-[1px] border-muted-foreground/25 h-[2rem]"
              role="link"
              onClick={() => void runQuery()}>
              <span>Run</span>
              <ArrowRight />
            </Button>
          )}
        </div>
      </div>

      {/* expanded */}
      {isExpanded && (
        <div className="flex flex-col px-3 py-2 border-t-[1px] border-muted-foreground/25">
          {/* form */}
          <div className="flex gap-3 my-3 mb-6">
            <div className="flex flex-col gap-2">
              <Label className="font-medium text-sm border-none">
                Name
              </Label>
              <Input
                type="text"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                placeholder="Name"
              />
            </div>
            <div className="flex grow flex-col gap-2">
              <Label className="font-medium text-sm border-none">
                Query
              </Label>
              <Input
                type="text"
                placeholder="Query"
                value={editQuery}
                onChange={e => setEditQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex grow flex-col gap-2">
              <Label className="font-medium text-sm border-none">
                Directory
              </Label>
              <Input
                type="text"
                value={editContext}
                onChange={e => setEditContext(e.target.value)}
                placeholder="Directory (optional)"
              />
            </div>
            <div className="flex grow flex-col gap-2">
              <Label className="text-sm border-none">Labels</Label>
              <Popover
                open={popoverOpen}
                onOpenChange={setPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={popoverOpen}
                    className="w-full justify-between">
                    Select labels
                    <ChevronsUpDown className="opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0">
                  <LabelSelect
                    selectedItems={selectedLabels}
                    setItems={setSelectedLabels}
                    setIsOpen={setLabelSelectOpen}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* footer */}
          <div className="flex justify-end items-end mb-0.5">
            <Button
              disabled={!isValid}
              onClick={handleSaveChanges}
              variant="default"
              size="sm">
              Save changes
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export { SavedQueryItem }
