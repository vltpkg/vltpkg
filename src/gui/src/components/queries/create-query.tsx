import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button.tsx'
import { Input } from '@/components/ui/input.tsx'
import { useGraphStore } from '@/state/index.ts'
import { v4 as uuidv4 } from 'uuid'
import type { QueryLabel, DashboardData } from '@/state/types.ts'
import { LabelSelect } from '@/components/labels/label-select.tsx'
import { LabelBadge } from '@/components/labels/label-badge.tsx'
import { useToast } from '@/components/hooks/use-toast.ts'
import { Label } from '@/components/ui/label.tsx'
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover.tsx'
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip.tsx'
import { ChevronsUpDown, CircleHelp } from 'lucide-react'
import { cn } from '@/lib/utils.ts'
import { DirectorySelect } from '@/components/directory-select.tsx'

interface CreateQueryProps {
  onClose: () => void
  className?: string
  dashboard?: DashboardData
}

export const CreateQuery = ({
  className,
  onClose,
  dashboard,
}: CreateQueryProps) => {
  const [queryName, setQueryName] = useState<string>('')
  const [query, setQuery] = useState<string>('')
  const [directory, setDirectory] = useState<string>('')
  const [labels, setLabels] = useState<QueryLabel[]>([])

  const [isCreationValid, setIsCreationValid] =
    useState<boolean>(false)
  const [_labelPopoverOpen, setLabelPopoverOpen] =
    useState<boolean>(false)

  const { toast } = useToast()
  const saveQuery = useGraphStore(state => state.saveQuery)

  useEffect(() => {
    if (queryName.trim() !== '' && query.trim() !== '') {
      setIsCreationValid(true)
    } else {
      setIsCreationValid(false)
    }
  }, [queryName, query])

  const handleCancel = () => {
    onClose()
  }

  const handleCreate = () => {
    saveQuery({
      id: uuidv4(),
      name: queryName,
      context: directory,
      query,
      dateCreated: new Date().toISOString(),
      dateModified: new Date().toISOString(),
      labels,
    })
    toast({
      title: `${queryName} saved successfully`,
    })
    onClose()
  }

  return (
    <div
      className={cn(
        'rounded-sm border border-[1px] border-muted-foreground/25 bg-card transition-all',
        className,
      )}>
      <div className="flex flex-col gap-3 px-3 py-3">
        {/* query preview */}
        <div className="flex w-full items-center">
          <p className="text-base font-medium">
            {queryName.trim() === '' ? 'New Query' : queryName}
          </p>

          <div className="ml-auto flex items-center gap-2">
            {labels.map((label, idx) => (
              <LabelBadge key={idx} {...label} />
            ))}
          </div>
        </div>

        <div className="mt-4 flex w-full gap-3">
          <div className="flex flex-col gap-2">
            <Label className="border-none text-sm font-medium">
              Name
            </Label>
            <Input
              type="text"
              value={queryName}
              onChange={e => setQueryName(e.target.value)}
              placeholder="Name"
            />
          </div>

          <div className="flex grow flex-col gap-2">
            <Label className="border-none text-sm font-medium">
              Query
            </Label>
            <Input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Query"
            />
          </div>

          <div className="flex w-[300px] flex-col gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger className="inline-flex cursor-default items-center">
                  <Label className="border-none text-sm font-medium">
                    Directory (optional)
                  </Label>
                  <CircleHelp
                    className="text-muted-foreground"
                    size={18}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  Set directory to 'Global' to reuse across all
                  projects.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <DirectorySelect
              directory={directory}
              setDirectory={setDirectory}
              dashboard={dashboard}
            />
          </div>

          <div className="flex w-[175px] flex-col gap-2">
            <Label className="border-none text-sm font-medium">
              Labels
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between">
                  Select labels
                  <ChevronsUpDown className="opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0">
                <LabelSelect
                  setIsOpen={setLabelPopoverOpen}
                  selectedItems={labels}
                  setItems={setLabels}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* footer */}
        <div className="mb-0.5 flex items-end justify-end gap-3">
          <Button onClick={handleCancel} variant="outline">
            Cancel
          </Button>
          <Button disabled={!isCreationValid} onClick={handleCreate}>
            Create Query
          </Button>
        </div>
      </div>
    </div>
  )
}
