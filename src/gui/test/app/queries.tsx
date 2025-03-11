import { vi, expect, afterEach, describe, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.js'
import { Queries } from '@/app/queries.jsx'

vi.mock('@/lib/start-dashboard-data.js', () => ({
  startDashboardData: vi.fn(),
}))

vi.mock('react-router', () => ({
  NavLink: 'gui-nav-link',
  useNavigate: vi.fn(),
}))

vi.mock('@/components/queries/saved-item.jsx', () => ({
  SavedQueryItem: 'gui-saved-query-item',
}))

vi.mock('@/components/ui/filter-search.jsx', () => ({
  FilterSearch: 'gui-filter-search',
}))

vi.mock('@/components/queries/delete-query.jsx', () => ({
  DeleteQuery: 'gui-delete-query',
}))

vi.mock('@/components/sort-toggle.jsx', () => ({
  SortToggle: 'gui-sort-toggle',
  sortAlphabeticallyAscending: vi.fn(),
}))

vi.mock('@/components/ui/button.jsx', () => ({
  Button: 'gui-button',
}))

vi.mock('lucide-react', () => ({
  Plus: 'gui-plus-icon',
  Tag: 'gui-tag-icon',
}))

vi.mock('@/components/ui/badge.jsx', () => ({
  Badge: 'gui-badge',
}))

vi.mock('@/components/ui/checkbox.jsx', () => ({
  Checkbox: 'gui-checkbox',
}))

vi.mock('@/components/queries/queries-empty-state.jsx', () => ({
  QueriesEmptyState: 'gui-queries-empty-state',
}))

vi.mock('@/components/queries/create-query.jsx', () => ({
  CreateQuery: 'gui-create-query',
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

describe('queries view', () => {
  it('queries render default', () => {
    const Container = () => {
      return <Queries />
    }

    const { container } = render(<Container />)
    expect(container.innerHTML).toMatchSnapshot()
  })
})
