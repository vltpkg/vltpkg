import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  waitFor,
  cleanup,
  fireEvent,
  render,
} from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import {
  SuggestedQueries,
  queries,
} from '@/components/explorer-grid/overview-sidebar/suggested-queries.tsx'

vi.mock('lucide-react', () => ({
  ChevronRight: 'gui-chevron-right',
  Search: 'gui-search',
  CornerDownRight: 'gui-corner-down-right',
}))

vi.mock('@/components/ui/button.tsx', () => ({
  Button: 'gui-button',
}))

vi.mock('@/components/query-bar/query-token.tsx', () => ({
  QueryToken: 'gui-query-token',
}))

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

beforeEach(() => {
  localStorage.setItem('suggestedQueriesExpanded', 'true')
})

afterEach(() => {
  const CleanUp = () => (useStore(state => state.reset)(), '')
  render(<CleanUp />)
  cleanup()
  localStorage.clear()
})

test('suggested-queries renders default', () => {
  const Container = () => {
    return <SuggestedQueries />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test.each(queries)('suggested-queries renders query %s', async q => {
  useStore.setState({ query: ':root' })

  const Container = () => {
    return <SuggestedQueries />
  }

  const { getByTestId } = render(<Container />)
  const section = getByTestId(q.name)
  const button = section.querySelector('[role="button"]')!
  fireEvent.click(button)

  await waitFor(() => {
    const updatedQuery = useStore.getState().query
    expect(updatedQuery).toBe(`:root ${q.query}`)
  })
})
