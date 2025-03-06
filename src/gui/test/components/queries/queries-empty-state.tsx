import { vi, expect, afterEach, describe, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.js'
import { QueriesEmptyState } from '@/components/queries/queries-empty-state.jsx'

vi.mock('@/components/ui/button.jsx', () => ({
  Button: 'gui-button',
}))

vi.mock('lucide-react', () => ({
  Command: 'gui-command-icon',
  Plus: 'gui-plus-icon',
  Star: 'gui-star-icon',
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

describe('queries-empty-state', () => {
  it('labels render default', () => {
    const Container = () => {
      return <QueriesEmptyState />
    }

    const { container } = render(<Container />)
    expect(container.innerHTML).toMatchSnapshot()
  })
})
