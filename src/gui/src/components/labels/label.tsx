import { useEffect, useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox.jsx'
import { Button } from '@/components/ui/button.jsx'
import { LabelBadge } from '@/components/labels/label-badge.jsx'
import { ArrowUpRight, Palette } from 'lucide-react'
import { Label as FormLabel } from '@/components/ui/label.jsx'
import { Input } from '@/components/ui/input.jsx'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover.jsx'
import { ColorPicker } from '@/components/ui/color-picker.jsx'
import type { QueryLabel } from '@/state/types.js'
import { useGraphStore } from '@/state/index.js'
import { useToast } from '@/components/hooks/use-toast.js'

interface LabelProps {
  queryLabel: QueryLabel
  checked: boolean
  handleSelect: (label: QueryLabel) => void
}

const Label = ({ queryLabel, checked, handleSelect }: LabelProps) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false)
  const [editDescription, setEditDescription] = useState<string>('')
  const [editName, setEditName] = useState<string>('')
  const [editColor, setEditColor] = useState<string>('')
  const updateSavedLabel = useGraphStore(
    state => state.updateSavedQueryLabel,
  )
  const { toast } = useToast()
  const [queriesReferenced, setQueriesReferenced] =
    useState<number>(0)
  const savedQueries = useGraphStore(state => state.savedQueries)

  const handleEdit = () => {
    setIsExpanded(!isExpanded)
  }

  const handleSaveChanges = () => {
    const updatedItem: QueryLabel = {
      ...queryLabel,
      name: editName,
      description: editDescription,
      color: editColor,
    }
    updateSavedLabel(updatedItem)
    setIsExpanded(false)
    toast({
      title: `${editName} saved successfully`,
    })
  }

  const navigateToRef = () => {
    window.location.href =
      '/queries?label=' + encodeURIComponent(`${editName}`)
  }

  useEffect(() => {
    setQueriesReferenced(0)

    const count = savedQueries?.reduce((acc, query) => {
      return (
        acc +
        (query.labels?.filter(label => label.name === queryLabel.name)
          .length || 0)
      )
    }, 0)

    setQueriesReferenced(count || 0)
  }, [queryLabel, savedQueries])

  useEffect(() => {
    setEditName(queryLabel.name)
    setEditDescription(queryLabel.description)
    setEditColor(queryLabel.color)
  }, [queryLabel])

  return (
    <div className="bg-neutral-50/50 dark:bg-neutral-950 rounded-sm transition-all border border-[1px] border-muted-foreground/25 group hover:border-foreground/50">
      <div className="grid grid-cols-8 flex items-center px-3 py-2">
        <div className="col-span-2 flex gap-3 items-center">
          <Checkbox
            onCheckedChange={() => handleSelect(queryLabel)}
            checked={checked}
            className="border-muted-foreground/25 group-hover:border-muted-foreground/50"
          />
          <LabelBadge
            name={editName.trim() !== '' ? editName : 'Label preview'}
            color={editColor}
          />
        </div>
        <div className="col-span-4 flex items-center">
          {!isExpanded && (
            <p className="text-sm truncate">{editDescription}</p>
          )}
        </div>
        <div className="flex items-center justify-center">
          <Button
            variant="ghost"
            className="flex items-center justify-center gap-1"
            onClick={navigateToRef}>
            <span>{queriesReferenced}</span>
            <ArrowUpRight />
          </Button>
        </div>
        <div className="flex items-center justify-end">
          <Button
            variant="outline"
            className="text-sm px-3 rounded-sm border border-[1px] border-muted-foreground/25 h-[2rem]"
            onClick={handleEdit}>
            {isExpanded ? 'Close' : 'Edit'}
          </Button>
        </div>
      </div>

      {/* expanded */}
      {isExpanded && (
        <div className="pt-6 mb-3 flex flex-col px-3 py-2 border-t-[1px] border-muted-foreground/25">
          <div className="flex gap-3">
            <div className="flex flex-col gap-2">
              <FormLabel className="text-sm border-none">
                Name
              </FormLabel>
              <Input
                type="text"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                placeholder="Name"
              />
            </div>
            <div className="flex flex-col gap-2 grow">
              <FormLabel className="text-sm border-none">
                Description
              </FormLabel>
              <Input
                type="text"
                value={editDescription}
                onChange={e => setEditDescription(e.target.value)}
                placeholder="Description (optional)"
              />
            </div>
            <div className="flex flex-col gap-2">
              <FormLabel className="text-sm border-none">
                Color
              </FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <Button className="w-[120px]" variant="outline">
                    <Palette />
                    <span>{editColor}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent>
                  <ColorPicker
                    defaultInput={editColor}
                    defaultColor={editColor}
                    onChange={setEditColor}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex items-end mb-0.5">
              <Button
                onClick={handleSaveChanges}
                variant="default"
                size="sm">
                Save changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export { Label }
