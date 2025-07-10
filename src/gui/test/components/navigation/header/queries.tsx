import { vi, test, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import { QueriesHeader } from '@/components/navigation/header/queries.tsx'

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  const CleanUp = () => (useStore(state => state.reset)(), '')
  render(<CleanUp />)
  cleanup()
})

vi.mock('react-router', () => ({
  NavLink: 'gui-nav-link',
}))

vi.mock('@/components/ui/filter-search.tsx', () => ({
  FilterSearch: 'gui-filter-search',
}))

vi.mock('@/components/queries/delete-query.tsx', () => ({
  DeleteQuery: 'gui-delete-query',
}))

vi.mock('@/components/ui/button.tsx', () => ({
  Button: 'gui-button',
}))

vi.mock('lucide-react', () => ({
  Plus: 'gui-plus-icon',
  Tag: 'gui-tag-icon',
}))

vi.mock('@/components/ui/badge.tsx', () => ({
  Badge: 'gui-badge',
}))

vi.mock('@/components/sort-toggle.tsx', () => ({
  SortToggle: 'gui-sort-toggle',
}))

test('QueriesHeader renders correctly', () => {
  const Container = () => {
    return <QueriesHeader />
  }
  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})
