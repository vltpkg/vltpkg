import { vi, test, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.js'
import { EmptyResultsState } from '@/components/explorer-grid/empty-results-state.jsx'

vi.mock('@/components/ui/button.jsx', () => ({
  Button: 'gui-button',
}))

vi.mock('lucide-react', () => ({
  ArrowRight: 'gui-arrow-right',
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

test('render default', async () => {
  const Container = () => {
    return <EmptyResultsState />
  }
  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})
