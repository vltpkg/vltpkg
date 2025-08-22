import { vi, test, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import { ExplorerHeader } from '@/components/navigation/header/explorer.tsx'

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  const CleanUp = () => (useStore(state => state.reset)(), '')
  render(<CleanUp />)
  cleanup()
})

vi.mock('@/components/query-bar/index.tsx', () => ({
  QueryBar: 'gui-query-bar',
}))

vi.mock('@/components/explorer-grid/root-button.tsx', () => ({
  RootButton: 'gui-root-button',
}))

vi.mock('@/components/explorer-grid/query-matches.tsx', () => ({
  QueryMatches: 'gui-query-matches',
}))

vi.mock('lucide-react', () => ({
  Search: 'gui-search-icon',
  Command: 'gui-command-icon',
}))

vi.mock('@/components/ui/kbd.tsx', () => ({
  Kbd: 'gui-kbd',
}))

vi.mock('@/components/query-builder/index.tsx', () => ({
  QueryBuilder: 'gui-query-builder',
}))

vi.mock('@/components/explorer-grid/save-query.tsx', () => {
  return {
    default: 'gui-save-query-button',
  }
})

test('ExplorerHeader renders correctly', () => {
  const Container = () => {
    return <ExplorerHeader />
  }
  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})
