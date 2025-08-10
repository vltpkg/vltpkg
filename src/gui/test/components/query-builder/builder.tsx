import { vi, describe, it, expect, afterEach } from 'vitest'
import {
  cleanup,
  render,
  fireEvent,
  act,
  screen,
} from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore } from '@/state/index.ts'
import { BuilderCombobox } from '@/components/query-builder/builder.tsx'
import type { UiNode } from '@/components/query-builder/ui-node-types.ts'

vi.mock('@/components/ui/button.tsx', () => ({
  Button: 'gui-button',
}))

vi.mock('@/components/ui/tooltip.tsx', () => ({
  Tooltip: 'gui-tooltip',
  TooltipProvider: 'gui-tooltip-provider',
  TooltipPortal: 'gui-tooltip-portal',
  TooltipContent: 'gui-tooltip-content',
  TooltipTrigger: 'gui-tooltip-trigger',
}))

vi.mock('@/components/ui/command.tsx', () => ({
  Command: 'gui-command',
  CommandEmpty: 'gui-command-empty',
  CommandGroup: 'gui-command-group',
  CommandInput: 'gui-command-input',
  CommandItem: 'gui-command-item',
  CommandList: 'gui-command-list',
  CommandSeparator: 'gui-command-separator',
}))

vi.mock('@/components/ui/popover.tsx', () => ({
  Popover: 'gui-popover',
  PopoverContent: 'gui-popover-content',
  PopoverTrigger: 'gui-popover-trigger',
}))

vi.mock('@/components/ui/dropdown-menu.tsx', () => ({
  DropdownMenu: 'gui-dropdown-menu',
  DropdownMenuContent: 'gui-dropdown-menu-content',
  DropdownMenuItem: 'gui-dropdown-menu-item',
  DropdownMenuTrigger: 'gui-dropdown-menu-trigger',
}))

vi.mock('@/components/ui/dialog.tsx', () => ({
  Dialog: 'gui-dialog',
  DialogTitle: 'gui-dialog-title',
  DialogDescription: 'gui-dialog-description',
  DialogHeader: 'gui-dialog-header',
  DialogContent: 'gui-dialog-content',
  DialogPortal: 'gui-dialog-portal',
  DialogTrigger: 'gui-dialog-trigger',
}))

vi.mock('@/components/ui/input.tsx', () => ({
  Input: 'gui-input',
}))

vi.mock('lucide-react', () => ({
  Plus: 'gui-plus-icon',
  ChevronRight: 'gui-chevron-right-icon',
  GripVertical: 'gui-grip-vertical-icon',
}))

// Minimal ResizeObserver polyfill for JSDOM
if (!(globalThis as any).ResizeObserver) {
  ;(globalThis as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

// Minimal scrollIntoView polyfill for JSDOM
if (!(Element.prototype as any).scrollIntoView) {
  ;(Element.prototype as any).scrollIntoView = () => {}
}

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  const CleanUp = () => (useGraphStore(state => state.reset)(), '')
  render(<CleanUp />)
  cleanup()
})

const DummyWrapper = () => {
  const setNodes = (
    _updater: (nodes: UiNode[] | undefined) => UiNode[] | undefined,
  ) => undefined as unknown as UiNode[] | undefined
  return <BuilderCombobox setNodes={setNodes} nodes={undefined} />
}

describe('BuilderCombobox', () => {
  it('renders default (closed)', () => {
    const { container } = render(<DummyWrapper />)
    expect(container.innerHTML).toMatchSnapshot()
  })

  it('opens popover on plus click', async () => {
    const { container } = render(<DummyWrapper />)
    const btn = screen.getByTestId('query-builder-open')
    await act(async () => {
      fireEvent.click(btn)
    })
    expect(container.innerHTML).toMatchSnapshot()
  })

  it('shows hovered item description', async () => {
    const { container } = render(<DummyWrapper />)
    const btn = screen.getByTestId('query-builder-open')
    await act(async () => {
      fireEvent.click(btn)
    })

    const item = await screen.findByText('Production dependencies')
    await act(async () => {
      fireEvent.mouseEnter(item)
    })

    expect(container.innerHTML).toMatchSnapshot()
  })
})
