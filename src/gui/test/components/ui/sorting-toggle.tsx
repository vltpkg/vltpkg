import React from 'react'
import { vi, describe, it, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { SortingToggle } from '@/components/ui/sorting-toggle.jsx'

vi.mock('lucide-react', () => ({
  ArrowDownAz: 'gui-arrow-down-az-icon',
  ArrowDownZa: 'gui-arrow-down-za-icon',
}))

vi.mock('@/components/ui/tooltip.jsx', () => ({
  Tooltip: 'gui-tooltip',
  TooltipContent: 'gui-tooltip-content',
  TooltipTrigger: 'gui-tooltip-trigger',
  TooltipProvider: 'gui-tooltip-provider',
}))

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  cleanup()
})

describe('sorting-toggle', () => {
  it('should render correctly', () => {
    const setStateMock = vi.fn()
    vi.spyOn(React, 'useState').mockReturnValue(['', setStateMock])

    const mockData = [
      {
        id: '01',
        name: 'mock-data-1',
      },
      {
        id: '02',
        name: 'mock-data-2',
      },
      {
        id: '03',
        name: 'mock-data-3',
      },
    ]

    const Container = () => {
      return (
        <SortingToggle
          filteredItems={mockData}
          setFilteredItems={setStateMock}
          sortKey="name"
        />
      )
    }

    const { container } = render(<Container />)

    expect(container.innerHTML).toMatchSnapshot()
  })
})
