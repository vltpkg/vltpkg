import React from 'react'
import { vi, describe, it, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { TablePageSelect } from '@/components/data-table/table-page-select.tsx'
import type { PaginationState } from '@tanstack/react-table'

vi.mock('@/components/ui/select.tsx', () => ({
  Select: 'gui-select',
  SelectContent: 'gui-select-content',
  SelectGroup: 'gui-select-group',
  SelectItem: 'gui-select-item',
  SelectTrigger: 'gui-select-trigger',
  SelectValue: 'gui-select-value',
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
