import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import { AsideOverviewEmptyState } from '@/components/explorer-grid/selected-item/aside/empty-state.tsx'

vi.mock('lucide-react', () => ({
  Package: 'gui-package-icon',
  Search: 'gui-search-icon',
}))

vi.mock('@/components/ui/inline-code.tsx', () => ({
  InlineCode: 'gui-inline-code',
}))

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  const CleanUp = () => (useStore(state => state.reset)(), '')
  render(<CleanUp />)
  cleanup()
})

test('AsideOverviewEmptyState renders correctly', () => {
  const Container = () => {
    return <AsideOverviewEmptyState />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})
