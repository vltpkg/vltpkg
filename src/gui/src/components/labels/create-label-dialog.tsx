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
} from '@/components/ui/dialog.jsx'
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover.jsx'
import { LabelBadge } from '@/components/labels/label-badge.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Label } from '@/components/ui/form-label.jsx'
import { Input } from '@/components/ui/input.jsx'
import { ColorPicker } from '@/components/ui/color-picker.jsx'
import { Palette } from 'lucide-react'
import  { type QueryLabel } from '@/state/types.js'
import { useGraphStore } from '@/state/index.js'
import { v4 as uuidv4 } from 'uuid'
import { useToast } from '@/components/hooks/use-toast.js'

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
  const [color, setColor] = useState<string>('#00FF5F')
  const [isValid, setIsValid] = useState<boolean>(false)
  const saveLabel = useGraphStore(state => state.saveQueryLabel)
  const { toast } = useToast()

  useEffect(() => {
    setLabelName(label)
  }, [label])

  useEffect(() => {
    (
      labelName !== '' &&
      labelName !== 'Label Preview' &&
      color !== ''
    ) ?
      setIsValid(true)
    : setIsValid(false)
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
    onClose ? onClose(false) : undefined
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Create label</DialogTitle>
        <DialogDescription></DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center w-fit">
            <LabelBadge
              name={
                labelName.trim() !== '' ? labelName : 'Label preview'
              }
              color={color}
            />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label>Name</Label>
          <Input
            value={labelName}
            onChange={e => setLabelName(e.target.value)}
            placeholder="Name"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Description</Label>
          <Input
            value={labelDescription}
            onChange={e => setLabelDescription(e.target.value)}
            placeholder="Description (optional)"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Color</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">
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
