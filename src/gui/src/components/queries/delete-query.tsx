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

import type { SavedQuery } from '@/state/types.ts'

interface DeleteQueryProps {
  deleteDialogOpen: boolean
  setDeleteDialogOpen: (o: boolean) => void
  selectedQueries: SavedQuery[]
  type: 'button' | 'icon'
  onClose?: () => void
  text?: string
  className?: string
}

const DeleteQuery = ({
  deleteDialogOpen,
  setDeleteDialogOpen,
  selectedQueries,
  type,
  onClose,
  text = 'Delete',
  className,
}: DeleteQueryProps) => {
  const { toast } = useToast()
  const [isTooltipOpen, setIsTooltipOpen] = useState<boolean>(false)
  const deleteQueries = useGraphStore(
    state => state.deleteSavedQueries,
  )

  const confirmDelete = () => {
    setDeleteDialogOpen(false)
    setIsTooltipOpen(false)
    deleteQueries(selectedQueries)
    toast({
      title: 'Deleted successfully',
    })
    if (onClose) onClose()
  }

  return (
    <Dialog
      open={deleteDialogOpen}
      onOpenChange={setDeleteDialogOpen}>
      <TooltipProvider>
        <Tooltip open={isTooltipOpen} onOpenChange={setIsTooltipOpen}>
          <DialogTrigger asChild>
            {type === 'icon' ?
              <Button
                onMouseEnter={() => setIsTooltipOpen(true)}
                onMouseLeave={() => setIsTooltipOpen(false)}
                disabled={selectedQueries.length <= 0}
                className={cn(
                  'rounded-sm border border-[1px] border-muted-foreground/25',
                  className,
                )}
                size="icon"
                variant="ghost">
                <Trash />
              </Button>
            : <Button variant="destructive">{text}</Button>}
          </DialogTrigger>
          <TooltipContent>
            Delete {selectedQueries.length <= 1 ? 'Query' : 'Queries'}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-medium">
            Delete {selectedQueries.length <= 1 ? 'Query' : 'Queries'}
          </DialogTitle>
          <DialogDescription />
        </DialogHeader>
        <div>
          You're about to delete:
          <ul className="my-3 list-none">
            {selectedQueries.map((query, idx) => (
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
  )
}

export { DeleteQuery }
