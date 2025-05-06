import { vi, expect, afterEach, describe, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import type { SavedQuery } from '@/state/types.ts'
import { DeleteQuery } from '@/components/queries/delete-query.tsx'

vi.mock('@/components/ui/dialog.tsx', () => ({
  Dialog: 'gui-dialog',
  DialogTitle: 'gui-dialog-title',
  DialogTrigger: 'gui-dialog-trigger',
  DialogDescription: 'gui-dialog-description',
  DialogHeader: 'gui-dialog-header',
  DialogFooter: 'gui-dialog-footer',
  DialogContent: 'gui-dialog-content',
}))

vi.mock('@/components/ui/tooltip.tsx', () => ({
  Tooltip: 'gui-tooltip',
  TooltipContent: 'gui-tooltip-content',
  TooltipProvider: 'gui-tooltip-provider',
}))

vi.mock('@/components/ui/button.tsx', () => ({
  Button: 'gui-button',
}))

vi.mock('lucide-react', () => ({
  Trash: 'gui-trash-icon',
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

describe('delete-query', () => {
  it('labels render default', () => {
    const setDeleteDialogOpenMock = vi.fn()

    const mockDeleteQueries: SavedQuery[] = [
      {
        id: '98074a4c-6c33-4880-9412-9e0eaf8db609',
        name: 'mock-saved-query',
        context: '/mock/context/query',
        query: 'mock-query',
        dateCreated: 'date-created',
        dateModified: 'date-modified',
        labels: [],
      },
      {
        id: '4709f181-334f-431e-bdb8-d5c093abdbe3',
        name: 'mock-saved-query-2',
        context: '/mock/context/query2',
        query: 'mock-query-2',
        dateCreated: 'date-created',
        dateModified: 'date-modified',
        labels: [],
      },
    ]

    const Container = () => {
      return (
        <DeleteQuery
          type="button"
          selectedQueries={mockDeleteQueries}
          deleteDialogOpen={true}
          setDeleteDialogOpen={setDeleteDialogOpenMock}
        />
      )
    }

    const { container } = render(<Container />)
    expect(container.innerHTML).toMatchSnapshot()
  })
})
