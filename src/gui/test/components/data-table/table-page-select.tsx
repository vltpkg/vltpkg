import React from 'react'
import { vi, describe, it, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { TablePageSelect } from '@/components/data-table/table-page-select.jsx'
import { type PaginationState } from '@tanstack/react-table'

vi.mock('@/components/ui/button.jsx', () => ({
  Button: 'gui-button',
}))

vi.mock('lucide-react', () => ({
  ChevronDown: 'lucide-chevron-down-icon',
}))

vi.mock('@/components/ui/tooltip.jsx', () => ({
  Tooltip: 'gui-tooltip',
  TooltipProvider: 'gui-tooltip-provider',
  TooltipContent: 'gui-tooltip-content',
  TooltipTrigger: 'gui-tooltip-trigger',
}))

vi.mock('@/components/ui/propover.jsx', () => ({
  Popover: 'gui-popover',
  PopoverContent: 'gui-popover-content',
  PopoverTrigger: 'gui-popover-trigger',
}))

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  cleanup()
})

describe('table-page-select', () => {
  it('should render correctly', () => {
    const mockPagination: PaginationState = {
      pageIndex: 0,
      pageSize: 10,
    }
    const mockSetPagination = vi.fn()

    const Container = () => {
      return (
        <TablePageSelect
          setPagination={mockSetPagination}
          pagination={mockPagination}
        />
      )
    }

    const { container } = render(<Container />)

    expect(container.innerHTML).toMatchSnapshot()
  })
})
