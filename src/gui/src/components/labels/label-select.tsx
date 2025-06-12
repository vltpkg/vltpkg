import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command.tsx'
import { Check, Pencil } from 'lucide-react'
import type { QueryLabel } from '@/state/types.ts'
import { useGraphStore } from '@/state/index.ts'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils.ts'
import { Button } from '@/components/ui/button.tsx'
import { CreateLabelModal } from '@/components/labels/create-label-dialog.tsx'
import { Dialog, DialogTrigger } from '@/components/ui/dialog.tsx'

interface LabelSelect {
  setIsOpen: (isOpen: boolean) => void
  setItems: React.Dispatch<React.SetStateAction<QueryLabel[]>>
  selectedItems: QueryLabel[]
  className?: string
}

const LabelSelect = ({
  setIsOpen,
  setItems,
  selectedItems,
  className = '',
}: LabelSelect) => {
  const savedLabels = useGraphStore(state => state.savedQueryLabels)
  const boxRef = useRef<HTMLDivElement>(null)
  const [inputText, setInputText] = useState<string>('')
  const [isCreateModalOpen, setIsCreateModalOpen] =
    useState<boolean>(false)

  /**
   * Manually check for MouseEvents to not close
   * popover until all desired labels have been selected.
   */
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (
        boxRef.current &&
        !boxRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClick)

    return () => {
      document.removeEventListener('mousedown', handleClick)
    }
  }, [setIsOpen])

  const handleSelect = (value: string) => {
    setItems(prevItems => {
      const isAlreadySelected = prevItems.some(
        item => item.name === value,
      )

      if (isAlreadySelected) {
        return prevItems.filter(item => item.name !== value)
      } else {
        const newItem = savedLabels?.find(
          label => label.name === value,
        )
        if (newItem) {
          return [...prevItems, newItem]
        }
      }
      return prevItems
    })
  }

  return (
    <Command ref={boxRef} className={className}>
      <CommandInput
        value={inputText}
        onValueChange={setInputText}
        className="w-full"
        placeholder="Search labels"
      />
      <CommandList className="rounded-sm">
        <CommandEmpty className="my-3 items-center px-3 py-2">
          <Dialog
            open={isCreateModalOpen}
            onOpenChange={setIsCreateModalOpen}>
            <div className="flex w-full flex-col items-center gap-3">
              <p className="text-sm text-neutral-400">
                No labels found.
              </p>
              <DialogTrigger asChild>
                <Button className="w-full font-normal">
                  Create label "{inputText}"
                </Button>
              </DialogTrigger>
              <CreateLabelModal
                label={inputText}
                onClose={setIsCreateModalOpen}
              />
            </div>
          </Dialog>
        </CommandEmpty>
        <CommandGroup>
          {savedLabels?.map(label => {
            const isSelected = selectedItems.some(
              (item: QueryLabel) => item.name === label.name,
            )
            return (
              <CommandItem
                key={label.id}
                value={label.name}
                onSelect={handleSelect}
                className="flex flex-col items-start gap-2">
                <div className="flex items-center gap-3">
                  <Check
                    className={cn(
                      'transition-opacity',
                      isSelected ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{
                        backgroundColor: label.color,
                      }}
                    />
                    <span>{label.name}</span>
                  </div>
                </div>
                <div className="-mt-1 ml-7">
                  <p className="text-xs text-neutral-500">
                    {label.description}
                  </p>
                </div>
              </CommandItem>
            )
          })}
        </CommandGroup>
      </CommandList>
      <Button
        className="rounded-[7px] border-none text-neutral-500 hover:text-primary"
        variant="outline"
        size="sm"
        asChild>
        <a href="/labels">
          <Pencil />
          <span>Edit labels</span>
        </a>
      </Button>
    </Command>
  )
}

export { LabelSelect }
