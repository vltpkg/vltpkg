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
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip.jsx'

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
      className={`group flex flex-col rounded-sm border border-[1px] bg-neutral-50 transition-all hover:border-foreground/50 dark:bg-neutral-950 ${isExpanded ? 'border-foreground/50' : 'border-muted-foreground/25'}`}>
      <div className="grid grid-cols-12 gap-4 px-3 py-2">
        <div className="col-span-2 flex grow items-center gap-3">
          <Checkbox
            checked={checked}
            onCheckedChange={() => handleSelect(item)}
            className="border-muted-foreground/25 group-hover:border-muted-foreground/50"
          />
          <p className="truncate text-sm font-medium">
            {editName.trim() !== '' ? editName : 'Query Name'}
          </p>
        </div>
        <div className="col-span-4 flex items-center">
          {!isExpanded && (
            <p className="w-[500px] truncate text-sm">{editQuery}</p>
          )}
        </div>
        <div className="col-span-2 flex w-full items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger className="w-full truncate text-left text-sm">
                {item.context}
              </TooltipTrigger>
              <TooltipContent>{item.context}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="col-span-2 flex items-center gap-2">
          {selectedLabels.map((label, idx) => (
            <LabelBadge
              key={idx}
              name={label.name}
              color={label.color}
            />
          ))}
        </div>

        <div className="col-span-2 flex items-center justify-end gap-4">
          <Button
            variant="outline"
            className="h-[2rem] rounded-sm border border-[1px] border-muted-foreground/25 px-3 text-sm"
            onClick={handleEdit}>
            {isExpanded ? 'Close' : 'Edit'}
          </Button>
          {editContext.trim() !== '' && (
            <Button
              variant="outline"
              className="h-[2rem] rounded-sm border border-[1px] border-muted-foreground/25 px-3 text-sm"
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
        <div className="flex flex-col border-t-[1px] border-muted-foreground/25 px-3 py-2">
          {/* form */}
          <div className="my-3 mb-6 flex gap-3">
            <div className="flex flex-col gap-2">
              <Label className="border-none text-sm font-medium">
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
              <Label className="border-none text-sm font-medium">
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
              <Label className="border-none text-sm font-medium">
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
              <Label className="border-none text-sm">Labels</Label>
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
          <div className="mb-0.5 flex items-end justify-end">
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
