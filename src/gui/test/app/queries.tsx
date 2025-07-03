import { vi, expect, afterEach, describe, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import { Queries } from '@/app/queries.tsx'

vi.mock('@/lib/start-data.ts', () => ({
  startDashboardData: vi.fn(),
}))

vi.mock('react-router', () => ({
  useNavigate: vi.fn(),
}))

vi.mock('@/components/queries/saved-item.tsx', () => ({
  SavedQueryItem: 'gui-saved-query-item',
}))

vi.mock('@/components/sort-toggle.tsx', () => ({
  sortAlphabeticallyAscending: vi.fn(),
}))

vi.mock('@/components/ui/checkbox.tsx', () => ({
  Checkbox: 'gui-checkbox',
}))

vi.mock('@/components/queries/queries-empty-state.tsx', () => ({
  QueriesEmptyState: 'gui-queries-empty-state',
}))

vi.mock('@/components/queries/create-query.tsx', () => ({
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
