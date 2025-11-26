import { vi, test, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import { useResultsStore } from '@/components/explorer-grid/results/context.tsx'
import { ResultsSort } from '@/components/explorer-grid/results/sort.tsx'

import type { GridItemData } from '@/components/explorer-grid/types.ts'
import type { ResultsStore } from '@/components/explorer-grid/results/context.tsx'

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

vi.mock('@/components/ui/button.tsx', () => ({
  Button: 'gui-button',
}))

vi.mock('lucide-react', () => ({
  ChevronUp: 'gui-chevron-up-icon',
  ChevronDown: 'gui-chevron-down-icon',
  ChevronLeft: 'gui-chevron-left-icon',
  ChevronRight: 'gui-chevron-right-icon',
  Layers: 'gui-layers-icon',
  SendToBack: 'gui-send-to-back-icon',
  CircleGauge: 'gui-circle-gauge-icon',
  List: 'gui-list-icon',
  GalleryVerticalEnd: 'gui-gallery-vertical-end-icon',
  Blocks: 'gui-blocks-icon',
}))

vi.mock('@/components/explorer-grid/results/context.tsx', () => ({
  useResultsStore: vi.fn(),
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

test('ResultsPaginationNavigation renders default', () => {
  const mockItems: GridItemData[] = []

  const mockState = {
    page: 1,
    totalPages: 1,
    pageSize: 25,
    pageItems: mockItems,
    allItems: mockItems,
    sortBy: 'alphabetical',
    sortDir: 'asc',
    setPage: vi.fn(),
    setSortBy: vi.fn(),
    setPageSize: vi.fn(),
    setSortDir: vi.fn(),
    setSort: vi.fn(),
  } satisfies ResultsStore

  vi.mocked(useResultsStore).mockImplementation(selector =>
    selector(mockState),
  )

  const Container = () => {
    return <ResultsSort />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})
