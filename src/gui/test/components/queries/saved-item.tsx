import { vi, expect, afterEach, describe, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import type { SavedQuery } from '@/state/types.ts'
import { SavedQueryItem } from '@/components/queries/saved-item.tsx'

vi.mock('react-router', () => ({
  useNavigate: vi.fn(),
}))

vi.mock('@/components/ui/input.tsx', () => ({
  Input: 'gui-label',
}))

vi.mock('@/components/ui/button.tsx', () => ({
  Button: 'gui-button',
}))

vi.mock('@/components/ui/checkbox.tsx', () => ({
  Checkbox: 'gui-checkbox',
}))

vi.mock('@/components/ui/label.tsx', () => ({
  Label: 'gui-label',
}))

vi.mock('@/components/labels/label-badge.tsx', () => ({
  LabelBadge: 'gui-label-badge',
}))

vi.mock('lucide-react', () => ({
  CircleHelp: 'gui-circle-help-icon',
  ArrowRight: 'gui-arrow-right-icon',
  ChevronsUpDown: 'gui-chevrons-up-down-icon',
}))

vi.mock('@/components/labels/label-select.tsx', () => ({
  LabelSelect: 'gui-label-select',
}))

vi.mock('@/components/ui/popover.tsx', () => ({
  Popover: 'gui-popover',
  PopoverTrigger: 'gui-popover-trigger',
  PopoverContent: 'gui-popover-content',
}))

vi.mock('@/components/ui/tooltip.tsx', () => ({
  Tooltip: 'gui-tooltip',
  TooltipProvider: 'gui-tooltip-provider',
  TooltipTrigger: 'gui-tooltip-trigger',
  TooltipContent: 'gui-tooltip-content',
}))

vi.mock('@/components/directory-select.tsx', () => ({
  DirectorySelect: 'gui-directory-select',
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
