import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { LabelBadge } from '@/components/labels/label-badge.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Input } from '@/components/ui/input.jsx'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover.jsx'
import { ColorPicker } from '@/components/ui/color-picker.jsx'
import { Palette } from 'lucide-react'
import { useGraphStore } from '@/state/index.js'
import { type Color } from '@/state/types.js'
import { useToast } from '@/components/hooks/use-toast.js'
import { v4 as uuidv4 } from 'uuid'

interface CreateLabelProps {
  closeCreate: () => void
}

const CreateLabel = ({ closeCreate }: CreateLabelProps) => {
  const [labelName, setLabelName] = useState<string>('Label preview')
  const [labelDescription, setLabelDescription] = useState<string>('')
  const [selectedColor, setSelectedColor] = useState<Color>('#00FF5F')
  const [isCreationValid, setIsCreationValid] =
    useState<boolean>(false)
  const saveQueryLabel = useGraphStore(state => state.saveQueryLabel)
  const { toast } = useToast()

  const handleCancel = () => {
    closeCreate()
  }

  const handleCreate = () => {
    saveQueryLabel({
      id: uuidv4(),
      name: labelName,
      description: labelDescription,
      color: selectedColor,
    })
    toast({
      title: `${labelName} saved successfully`,
    })
    closeCreate()
  }

  useEffect(() => {
    if (
      labelName.trim() !== '' &&
      labelName.trim() !== 'Label preview'
    ) {
      setIsCreationValid(true)
    } else {
      setIsCreationValid(false)
    }
  }, [labelName, labelDescription, selectedColor])

  return (
    <div className="rounded-sm border border-[1px] border-muted-foreground/25 bg-neutral-100 transition-all dark:bg-neutral-950">
      <div className="flex flex-col gap-3 px-3 py-3">
        {/* label preview */}
        <div>
          <LabelBadge
            name={
              labelName.trim() !== '' ? labelName : 'Label preview'
            }
            color={selectedColor}
          />
        </div>
        <div className="mt-4 flex w-full gap-3">
          <div className="flex flex-col gap-2">
            <Label className="border-none text-sm font-medium">
              Name
            </Label>
            <Input
              type="text"
              value={labelName}
              onChange={e => setLabelName(e.target.value)}
              placeholder="Name"
            />
          </div>
          <div className="flex grow flex-col gap-2">
            <Label className="border-none text-sm font-medium">
              Description
            </Label>
            <Input
              type="text"
              value={labelDescription}
              onChange={e => setLabelDescription(e.target.value)}
              placeholder="Description (optional)"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label className="border-none text-sm font-medium">
              Color
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button className="w-[120px]" variant="outline">
                  <Palette />
                  <span>{selectedColor}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent>
                <ColorPicker
                  defaultColor={selectedColor}
                  defaultInput={selectedColor}
                  onChange={setSelectedColor}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex items-end justify-end gap-3">
            <Button onClick={handleCancel} variant="outline">
              Cancel
            </Button>
            <Button
              disabled={!isCreationValid}
              onClick={handleCreate}>
              Create label
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export { CreateLabel }
