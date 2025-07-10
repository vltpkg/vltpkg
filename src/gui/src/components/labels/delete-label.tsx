import { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogHeader,
  DialogFooter,
  DialogContent,
} from '@/components/ui/dialog.tsx'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Trash } from 'lucide-react'
import { useToast } from '@/components/hooks/use-toast.ts'
import { useGraphStore } from '@/state/index.ts'
import { cn } from '@/lib/utils.ts'

import type { QueryLabel } from '@/state/types.ts'

interface DeleteLabelProps {
  deleteDialogOpen: boolean
  setDeleteDialogOpen: (o: boolean) => void
  selectedLabels: QueryLabel[]
  className?: string
}

const DeleteLabel = ({
  deleteDialogOpen,
  setDeleteDialogOpen,
  selectedLabels,
  className,
}: DeleteLabelProps) => {
  const { toast } = useToast()
  const [isTooltipOpen, setIsTooltipOpen] = useState<boolean>(false)
  const deleteQueryLabels = useGraphStore(
    state => state.deleteSavedQueryLabels,
  )

  const confirmDelete = () => {
    setDeleteDialogOpen(false)
    setIsTooltipOpen(false)
    deleteQueryLabels(selectedLabels)
    toast({
      title: 'Deleted successfully',
    })
  }

  return (
    <div className="flex items-center">
      <div className="flex items-center">
        <Dialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}>
          <TooltipProvider>
            <Tooltip
              open={isTooltipOpen}
              onOpenChange={setIsTooltipOpen}>
              <DialogTrigger asChild>
                <Button
                  onMouseEnter={() => setIsTooltipOpen(true)}
                  onMouseLeave={() => setIsTooltipOpen(false)}
                  disabled={selectedLabels.length <= 0}
                  className={cn(
                    'rounded-sm border border-[1px] border-muted-foreground/25',
                    className,
                  )}
                  size="icon"
                  variant="ghost">
                  <Trash />
                </Button>
              </DialogTrigger>
              <TooltipContent>
                Delete{' '}
                {selectedLabels.length <= 1 ? 'Label' : 'Labels'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-medium">
                Delete{' '}
                {selectedLabels.length <= 1 ? 'Label' : 'Labels'}
              </DialogTitle>
              <DialogDescription />
            </DialogHeader>
            <div>
              You're about to delete:
              <ul className="my-3 list-none">
                {selectedLabels.map((query, idx) => (
                  <li key={idx} className="font-medium">
                    {query.name}
                  </li>
                ))}
              </ul>
              This action cannot be undone.
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}>
                No, Keep It.
              </Button>
              <Button variant="destructive" onClick={confirmDelete}>
                Yes, Delete!
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

export { DeleteLabel }
