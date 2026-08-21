import * as React from 'react'
import { Check, ChevronDown } from 'lucide-react'

import { cn } from '@/lib/utils.ts'

export type SelectOption = {
  label: string
  value: string
}

export type SelectProps = {
  options: SelectOption[]
  placeholder?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  disabled?: boolean
  className?: string
}

const Select = React.forwardRef<HTMLButtonElement, SelectProps>(
  (
    {
      options,
      placeholder = 'Select an option',
      defaultValue,
      onValueChange,
      disabled,
      className,
    },
    forwardedRef,
  ) => {
    const [open, setOpen] = React.useState(false)
    const [value, setValue] = React.useState<string | undefined>(
      defaultValue,
    )
    const [highlightedIndex, setHighlightedIndex] = React.useState(
      () => options.findIndex(o => o.value === defaultValue),
    )

    const containerRef = React.useRef<HTMLDivElement>(null)
    const triggerRef = React.useRef<HTMLButtonElement | null>(null)
    const listRef = React.useRef<HTMLUListElement>(null)

    const setTriggerRef = (node: HTMLButtonElement | null) => {
      triggerRef.current = node
      if (typeof forwardedRef === 'function') forwardedRef(node)
      else if (forwardedRef) forwardedRef.current = node
    }

    const selected = options.find(o => o.value === value)

    React.useEffect(() => {
      if (!open) return

      const handlePointerDown = (e: PointerEvent) => {
        if (!containerRef.current?.contains(e.target as Node)) {
          setOpen(false)
        }
      }

      document.addEventListener('pointerdown', handlePointerDown)
      return () =>
        document.removeEventListener('pointerdown', handlePointerDown)
    }, [open])

    React.useEffect(() => {
      if (!open) return
      const index = options.findIndex(o => o.value === value)
      setHighlightedIndex(index === -1 ? 0 : index)
    }, [open])

    React.useEffect(() => {
      if (!open || highlightedIndex < 0) return
      const el = listRef.current?.children[highlightedIndex] as
        HTMLElement | undefined
      el?.scrollIntoView({ block: 'nearest' })
    }, [open, highlightedIndex])

    const commit = (index: number) => {
      const option = options[index]
      setValue(option.value)
      onValueChange?.(option.value)
      setOpen(false)
    }

    const onTriggerKeyDown = (e: React.KeyboardEvent) => {
      if (!open) {
        if (
          e.key === 'ArrowDown' ||
          e.key === 'ArrowUp' ||
          e.key === 'Enter' ||
          e.key === ' '
        ) {
          e.preventDefault()
          setOpen(true)
        }
        return
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setHighlightedIndex(i =>
            Math.min(i + 1, options.length - 1),
          )
          break
        case 'ArrowUp':
          e.preventDefault()
          setHighlightedIndex(i => Math.max(i - 1, 0))
          break
        case 'Home':
          e.preventDefault()
          setHighlightedIndex(0)
          break
        case 'End':
          e.preventDefault()
          setHighlightedIndex(options.length - 1)
          break
        case 'Enter':
        case ' ':
          e.preventDefault()
          commit(highlightedIndex)
          break
        case 'Escape':
          e.preventDefault()
          setOpen(false)
          break
        case 'Tab':
          setOpen(false)
          break
      }
    }

    return (
      <div ref={containerRef} className="relative inline-block">
        <button
          ref={setTriggerRef}
          type="button"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          disabled={disabled}
          onClick={() => setOpen(o => !o)}
          onKeyDown={onTriggerKeyDown}
          data-state={open ? 'open' : 'closed'}
          className={cn(
            'flex h-10 w-full min-w-[10rem] items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none transition-colors hover:border-foreground/20 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=open]:ring-2 data-[state=open]:ring-ring data-[state=open]:ring-offset-2',
            className,
          )}>
          <span
            className={cn(
              'truncate',
              !selected && 'text-muted-foreground',
            )}>
            {selected ? selected.label : placeholder}
          </span>
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-150',
              open && 'rotate-180',
            )}
          />
        </button>

        {open && (
          <ul
            ref={listRef}
            role="listbox"
            aria-activedescendant={
              highlightedIndex >= 0 ?
                `select-option-${highlightedIndex}`
              : undefined
            }
            className="absolute z-50 mt-1.5 max-h-60 w-full min-w-[10rem] overflow-auto rounded-md border border-input bg-popover p-1 text-popover-foreground shadow-md">
            {options.map((option, index) => (
              <li
                key={option.value}
                id={`select-option-${index}`}
                role="option"
                aria-selected={option.value === value}
                onClick={() => commit(index)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={cn(
                  'flex cursor-default select-none items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-sm outline-none',
                  index === highlightedIndex &&
                    'bg-accent text-accent-foreground',
                )}>
                {option.label}
                {option.value === value && (
                  <Check className="h-4 w-4 shrink-0" />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  },
)
Select.displayName = 'Select'

export { Select }
