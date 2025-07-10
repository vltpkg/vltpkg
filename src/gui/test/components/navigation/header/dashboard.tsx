import { vi, test, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import { DashboardHeader } from '@/components/navigation/header/dashboard.tsx'

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  const CleanUp = () => (useStore(state => state.reset)(), '')
  render(<CleanUp />)
  cleanup()
})

vi.mock('@/components/sort-dropdown.tsx', () => ({
  SortDropdown: 'gui-sort-dropdown',
}))

vi.mock('@/components/ui/button.tsx', () => ({
  Button: 'gui-button',
}))

vi.mock('lucide-react', () => ({
  Plus: 'gui-plus-icon',
}))

vi.mock('@/components/ui/filter-search.tsx', () => ({
  FilterSearch: 'gui-filter-search',
}))

vi.mock('@/components/data-table/table-filter-search.tsx', () => ({
  TableFilterSearch: 'gui-table-filter-search',
}))

vi.mock('@/components/data-table/table-view-dropdown.tsx', () => ({
  TableViewDropdown: 'gui-table-view-dropdown',
}))

vi.mock(
  '@/components/dashboard-grid/dashboard-view-toggle.tsx',
  () => ({
    DashboardViewToggle: 'gui-dashboard-view-toggle',
  }),
)

vi.mock('react-router', () => ({
  NavLink: 'gui-nav-link',
}))

test('DashboardHeader renders correctly', () => {
  const Container = () => {
    return <DashboardHeader />
  }
  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})
