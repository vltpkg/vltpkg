import React from 'react'
import { vi, describe, it, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { SortToggle } from '@/components/sort-toggle.jsx'

vi.mock('@/components/ui/toggle.jsx', () => ({
  Toggle: 'gui-toggle',
}))

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  cleanup()
})

describe('toggle', () => {
  it('should render correctly', () => {
    const mockSetFilteredItems = vi.fn()

    const mockFilteredItems = [
      {
        name: 'mock-item-1',
      },
      {
        name: 'mock-item-2',
      },
      {
        name: 'mock-item-3',
      },
    ]

    const Container = () => {
      return (
        <SortToggle
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
