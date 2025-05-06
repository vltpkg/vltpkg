/**
 * Used in views to quickly create labels
 * and not redirect to the '/manage-labels' route
 */
import { useEffect, useState } from 'react'
import {
  DialogDescription,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog.tsx'
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover.tsx'
import { LabelBadge } from '@/components/labels/label-badge.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Label } from '@/components/ui/label.tsx'
import { Input } from '@/components/ui/input.tsx'
import { ColorPicker } from '@/components/ui/color-picker.tsx'
import { Palette } from 'lucide-react'
import type { Color, QueryLabel } from '@/state/types.ts'
import { useGraphStore } from '@/state/index.ts'
import { v4 as uuidv4 } from 'uuid'
import { useToast } from '@/components/hooks/use-toast.ts'

interface CreateLabelModalProps {
  onClose?: (isOpen: boolean) => void
  label?: string
}

const CreateLabelModal = ({
  onClose,
  label = 'Label Preview',
}: CreateLabelModalProps) => {
  const [labelName, setLabelName] = useState<string>(label)
  const [labelDescription, setLabelDescription] = useState<string>('')
  const [color, setColor] = useState<Color>('#00FF5F')
  const [isValid, setIsValid] = useState<boolean>(false)
  const saveLabel = useGraphStore(state => state.saveQueryLabel)
  const { toast } = useToast()

  useEffect(() => {
    setLabelName(label)
  }, [label])

  useEffect(() => {
    if (labelName !== '' && labelName !== 'Label Preview') {
      setIsValid(true)
    } else {
      setIsValid(false)
    }
  }, [labelName, color])

  const handleSave = () => {
    const item: QueryLabel = {
      id: uuidv4(),
      name: labelName,
      description: labelDescription,
      color: color,
    }
    saveLabel(item)
    toast({
      title: `${labelName} successfully created`,
    })
    if (onClose) {
      onClose(false)
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle className="text-lg font-medium">
          Create label
        </DialogTitle>
        <DialogDescription></DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex w-fit items-center">
            <LabelBadge
              name={
                labelName.trim() !== '' ? labelName : 'Label preview'
              }
              color={color}
            />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label className="border-none text-xs font-medium">
            Name
          </Label>
          <Input
            value={labelName}
            onChange={e => setLabelName(e.target.value)}
            placeholder="Name"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label className="border-none text-xs font-medium">
            Description
          </Label>
          <Input
            value={labelDescription}
            onChange={e => setLabelDescription(e.target.value)}
            placeholder="Description (optional)"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label className="border-none text-xs font-medium">
            Color
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="font-normal">
                <Palette />
                <span>{color}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent>
              <ColorPicker
                defaultInput={color}
                defaultColor={color}
                onChange={setColor}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline">Cancel</Button>
        </DialogClose>
        <Button disabled={!isValid} onClick={handleSave}>
          Create
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}

export { CreateLabelModal }
