import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import { useSelectedItemStore } from '@/components/explorer-grid/selected-item/context.tsx'
import { AsideBugs } from '@/components/explorer-grid/selected-item/aside/aside-bugs.tsx'

import type { SelectedItemStore } from '@/components/explorer-grid/selected-item/context.tsx'

vi.mock(
  '@/components/explorer-grid/selected-item/context.tsx',
  () => ({
    useSelectedItemStore: vi.fn(),
    SelectedItemProvider: 'gui-selected-item-provider',
    useTabNavigation: vi.fn(() => ({
      tab: 'overview',
      subTab: undefined,
      setActiveTab: vi.fn(),
      setActiveSubTab: vi.fn(),
    })),
  }),
)

vi.mock(
  '@/components/explorer-grid/selected-item/aside/aside.tsx',
  () => ({
    AsideHeader: 'gui-aside-header',
    AsideSection: 'gui-aside-section',
    AsideItem: 'gui-aside-item',
  }),
)

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

test('AsideBugs renders nothing when bugs is empty', () => {
  const mockState = {
    manifest: {},
  } as unknown as SelectedItemStore

  vi.mocked(useSelectedItemStore).mockImplementation(selector =>
    selector(mockState),
  )

  const Container = () => {
    return <AsideBugs />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('AsideBugs renders with bugs data', () => {
  const mockState = {
    manifest: {
      bugs: [
        {
          type: 'link',
          url: 'https://www.acme.com/bugs1',
        },
        {
          type: 'link',
          url: 'https://www.acme.com/bugs2',
        },
      ],
    } as SelectedItemStore['manifest'],
  } as unknown as SelectedItemStore

  vi.mocked(useSelectedItemStore).mockImplementation(selector =>
    selector(mockState),
  )

  const Container = () => {
    return <AsideBugs />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})
