import React from 'react'
import { vi, describe, it, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import { DeleteLabel } from '@/components/labels/delete-label.tsx'
import type { QueryLabel } from '@/state/types.ts'

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

describe('delete-label', () => {
  const setStateMock = vi.fn()
  vi.spyOn(React, 'useState').mockReturnValue(['', setStateMock])

  const labels: QueryLabel[] = [
    {
      id: '8c79bb69-164b-420a-813a-c2e5d3b196e6',
      color: '#06b6d4',
      name: 'mock-label-1',
      description: 'mock label 1',
    },
    {
      id: '4859e408-3d4c-4773-85c6-87e63ad763cd',
      color: '#84cc16',
      name: 'mock-label-2',
      description: 'mock label 2',
    },
    {
      id: 'c70add9d-989a-49cd-9e58-42e63459764b',
      color: '#ef4444',
      name: 'mock-label-3',
      description: 'mock label 3',
    },
  ]

  it('should render correctly', () => {
    const Container = () => {
      return (
        <DeleteLabel
          selectedLabels={labels}
          deleteDialogOpen={false}
          setDeleteDialogOpen={setStateMock}
        />
      )
    }

    const { container } = render(<Container />)

    expect(container.innerHTML).toMatchSnapshot()
  })
})
