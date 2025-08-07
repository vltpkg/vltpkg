import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import { AsideOverview } from '@/components/explorer-grid/selected-item/aside/index.tsx'

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
    Aside: 'gui-aside',
  }),
)

vi.mock(
  '@/components/explorer-grid/selected-item/aside/aside-funding.tsx',
  () => ({
    AsideFunding: 'gui-aside-funding',
  }),
)

vi.mock(
  '@/components/explorer-grid/selected-item/aside/aside-repo.tsx',
  () => ({
    AsideRepo: 'gui-aside-repo',
  }),
)

vi.mock(
  '@/components/explorer-grid/selected-item/aside/aside-bugs.tsx',
  () => ({
    AsideBugs: 'gui-aside-bugs',
  }),
)

vi.mock(
  '@/components/explorer-grid/selected-item/aside/aside-metadata.tsx',
  () => ({
    AsideMetadata: 'gui-aside-metadata',
  }),
)

vi.mock(
  '@/components/explorer-grid/selected-item/aside/use-empty-check.tsx',
  () => ({
    useEmptyCheck: vi.fn(() => ({
      isRepoEmpty: false,
      isFundingEmpty: false,
      isBugsEmpty: false,
      isMetadataEmpty: false,
    })),
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

test('AsideOverview renders with the correct structure', () => {
  const Container = () => {
    return <AsideOverview />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})
