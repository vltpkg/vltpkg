import { vi, test, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore } from '@/state/index.ts'
import { Results } from '@/components/explorer-grid/results/index.tsx'
import { joinDepIDTuple } from '@vltpkg/dep-id'

import type { GridItemData } from '@/components/explorer-grid/types.ts'

vi.mock('react-router', () => ({
  NavLink: 'gui-nav-link',
}))

vi.mock('lucide-react', () => ({
  PackageSearch: 'gui-package-search-icon',
  Home: 'gui-home-icon',
  List: 'gui-list-icon',
  Layers: 'gui-layers-icon',
  SendToBack: 'gui-send-to-back-icon',
  GalleryVerticalEnd: 'gui-gallery-vertical-end-icon',
  Blocks: 'gui-blocks-icon',
}))

vi.mock('@/components/icons/index.ts', () => ({
  Query: 'gui-query-icon',
}))

vi.mock('@/components/explorer-grid/results/result-item.tsx', () => ({
  ResultItem: ({ item }: { item: GridItemData }) => (
    <div data-testid="result-item" data-id={item.id}>
      {item.name}@{item.version}
    </div>
  ),
}))

vi.mock('@/components/ui/button.tsx', () => ({
  Button: 'gui-button',
}))

vi.mock('@/components/ui/empty-state.tsx', () => ({
  Empty: 'gui-empty',
  EmptyMedia: 'gui-empty-media',
  EmptyTitle: 'gui-empty-title',
  EmptyHeader: 'gui-empty-header',
  EmptyContent: 'gui-empty-content',
  EmptyDescription: 'gui-empty-description',
}))

vi.mock('@/components/table/index.tsx', () => ({
  Table: 'gui-table',
  TableBody: 'gui-table-body',
  TableRow: 'gui-table-row',
  TablePaginationList: 'gui-table-pagination-list',
  TablePaginationListButton: 'gui-table-pagination-list-button',
  TablePaginationListItem: 'gui-table-pagination-list-item',
  TableFilterList: 'gui-table-filter-list',
  TableFilterListItem: 'gui-table-filter-list-item',
  TableFilterListButton: 'gui-table-filter-list-button',
  TableCaption: 'gui-table-caption',
  TableFooter: 'gui-table-footer',
}))

vi.mock('@/components/ui/cross.tsx', () => ({
  Cross: 'gui-cross',
}))

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  const CleanUp = () => (useGraphStore(state => state.reset)(), '')
  render(<CleanUp />)
  cleanup()
})

test('Results renders an empty state when there are no items', () => {
  const mockItems: GridItemData[] = []

  const Container = () => {
    return <Results allItems={mockItems} />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('Results displays items with pagination', () => {
  const mockItems: GridItemData[] = [
    {
      id: joinDepIDTuple(['registry', '', 'a@1.0.0']),
      name: 'a',
      version: '1.0.0',
      insights: {},
      toJSON() {},
    } as unknown as GridItemData,
    {
      id: joinDepIDTuple(['registry', '', 'b@1.0.0']),
      name: 'b',
      version: '1.0.0',
      insights: {},
      toJSON() {},
    } as unknown as GridItemData,
    {
      id: joinDepIDTuple(['registry', '', 'c@1.0.0']),
      name: 'c',
      version: '1.0.0',
      insights: {},
      toJSON() {},
    } as unknown as GridItemData,
  ]

  const Container = () => {
    return <Results allItems={mockItems} />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('Results displays many items triggering pagination', () => {
  const mockItems: GridItemData[] = Array.from(
    { length: 50 },
    (_, i) => ({
      id: joinDepIDTuple(['registry', '', `package-${i}@1.0.0`]),
      name: `package-${i}`,
      version: '1.0.0',
      insights: {},
      toJSON() {},
    }),
  ) as unknown as GridItemData[]

  const Container = () => {
    return <Results allItems={mockItems} />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})
