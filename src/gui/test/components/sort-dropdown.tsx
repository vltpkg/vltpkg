import React from 'react'
import { vi, describe, it, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { SortDropdown } from '@/components/sort-dropdown.tsx'

vi.mock('@/components/ui/dropdown-menu.tsx', () => ({
  DropdownMenu: 'gui-dropdown-menu',
  DropdownMenuTrigger: 'gui-dropdown-menu-trigger',
  DropdownMenuContent: 'gui-dropdown-menu-content',
  DropdownMenuCheckboxItem: 'gui-dropdown-menu-checkbox-item',
}))

vi.mock('@/components/ui/button.tsx', () => ({
  Button: 'gui-button',
}))

vi.mock('lucide-react', () => ({
  ChevronDown: 'gui-chevron-down',
}))

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  cleanup()
})

describe('sort dropdown', () => {
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
        <SortDropdown
          sortKey="name"
          setFilteredItems={mockSetFilteredItems}
          items={mockFilteredItems}
        />
      )
    }

    const { container } = render(<Container />)

    expect(container.innerHTML).toMatchSnapshot()
  })
})
