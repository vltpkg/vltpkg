import React from 'react'
import { vi, describe, it, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { FilterSearch } from '@/components/ui/filter-search.tsx'

vi.mock('react-router', () => ({
  useSearchParams: vi.fn().mockReturnValue(['', vi.fn()]),
}))

vi.mock('@/components/ui/input.tsx', () => ({
  Input: 'gui-input',
}))

vi.mock('@/components/ui/kbd.tsx', () => ({
  Kbd: 'gui-kbd',
}))

vi.mock('lucide-react', () => ({
  Command: 'gui-command-icon',
  Search: 'gui-search-icon',
}))

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  cleanup()
})

describe('filter-search', () => {
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
        <FilterSearch
          placeholder="mock-test"
          items={mockData}
          setFilteredItems={setStateMock}
        />
      )
    }

    const { container } = render(<Container />)

    expect(container.innerHTML).toMatchSnapshot()
  })
})
