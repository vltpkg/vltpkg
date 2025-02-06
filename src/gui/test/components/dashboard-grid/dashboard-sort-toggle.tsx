import React from 'react'
import { vi, describe, it, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { DashboardSortToggle } from '@/components/dashboard-grid/dashboard-sort-toggle.jsx'

vi.mock('@/components/ui/toggle.jsx', () => ({
  Toggle: 'gui-toggle',
}))

vi.mock('lucide-react', () => ({
  ArrowDownAz: 'gui-arrow-down-az',
  ArrowDownZa: 'gui-arrow-down-za',
}))

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  cleanup()
})

describe('dashboard-sort-toggle', () => {
  it('should render correctly', () => {
    const mockSetFilteredItems = vi.fn()

    const mockItems = [
      {
        name: 'mock-data-1',
      },
    ]

    const Container = () => {
      return (
        <DashboardSortToggle
          sortKey="name"
          setFilteredItems={mockSetFilteredItems}
          filteredItems={mockItems}
        />
      )
    }

    const { container } = render(<Container />)

    expect(container.innerHTML).toMatchSnapshot()
  })
})
