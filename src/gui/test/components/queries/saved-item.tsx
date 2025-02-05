import { vi, expect, afterEach, describe, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.js'
import { type SavedQuery } from '@/state/types.js'
import { SavedQueryItem } from '@/components/queries/saved-item.jsx'

vi.mock('@/components/ui/input.jsx', () => ({
  Input: 'gui-label',
}))

vi.mock('@/components/ui/button.jsx', () => ({
  Button: 'gui-button',
}))

vi.mock('@/components/ui/checkbox.jsx', () => ({
  Checkbox: 'gui-checkbox',
}))

vi.mock('@/components/ui/label.jsx', () => ({
  Label: 'gui-label',
}))

vi.mock('@/components/labels/label-badge.jsx', () => ({
  LabelBadge: 'gui-label-badge',
}))

vi.mock('lucide-react', () => ({
  ArrowRight: 'gui-arrow-right-icon',
  ChevronsUpDown: 'gui-chevrons-up-down-icon',
}))

vi.mock('@/components/labels/label-select.jsx', () => ({
  LabelSelect: 'gui-label-select',
}))

vi.mock('@/components/ui/popover.jsx', () => ({
  Popover: 'gui-popover',
  PopoverTrigger: 'gui-popover-trigger',
  PopoverContent: 'gui-popover-content',
}))

vi.mock('@/components/ui/tooltip.jsx', () => ({
  Tooltip: 'gui-tooltip',
  TooltipProvider: 'gui-tooltip-provider',
  TooltipTrigger: 'gui-tooltip-trigger',
  TooltipContent: 'gui-tooltip-content',
}))

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  const CleanUp = () => (useStore(state => state.reset)(), '')
  render(<CleanUp />)
  cleanup()
})

describe('labels view', () => {
  it('labels render default', () => {
    const mockHandleSelect = vi.fn()

    const mockSavedQuery: SavedQuery = {
      id: '98074a4c-6c33-4880-9412-9e0eaf8db609',
      name: 'mock-saved-query',
      context: '/mock/context/query',
      query: 'mock-query',
      dateCreated: 'date-created',
      dateModified: 'date-modified',
      labels: [],
    }

    const Container = () => {
      return (
        <SavedQueryItem
          item={mockSavedQuery}
          handleSelect={mockHandleSelect}
          checked={false}
        />
      )
    }

    const { container } = render(<Container />)
    expect(container.innerHTML).toMatchSnapshot()
  })
})
