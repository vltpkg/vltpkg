import React from 'react'
import { vi, describe, it, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { LabelsSortToggle } from '@/components/labels/labels-sort-toggle.jsx'

vi.mock('@/components/ui/toggle.jsx', () => ({
  Toggle: 'gui-toggle',
}))

vi.mock('lucide-react', () => ({
  ArrowDownAz: 'gui-arrow-down-az-icon',
  ArrowDownZa: 'gui-arrow-down-za-icon',
}))

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  cleanup()
})

describe('labels-sort-toggle', () => {
  it('should render correctly', () => {
    const mockSetFilteredItems = vi.fn()

    const mockFilteredItems = [
      {
        name: 'mock-data-1',
      },
      {
        name: 'mock-data-2',
      },
    ]

    const Container = () => {
      return (
        <LabelsSortToggle
          sortKey="name"
          setFilteredItems={mockSetFilteredItems}
          filteredItems={mockFilteredItems}
        />
      )
    }

    const { container } = render(<Container />)

    expect(container.innerHTML).toMatchSnapshot()
  })
})
