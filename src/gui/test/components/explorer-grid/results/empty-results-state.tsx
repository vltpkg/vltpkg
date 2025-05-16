import { vi, test, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import { EmptyResultsState } from '@/components/explorer-grid/results/empty-results-state.tsx'

vi.mock('react-router', () => ({
  useNavigate: vi.fn(),
}))

vi.mock('@/components/ui/button.tsx', () => ({
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
