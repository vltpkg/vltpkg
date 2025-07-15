import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import { useSelectedItemStore } from '@/components/explorer-grid/selected-item/context.tsx'
import { AsideFunding } from '@/components/explorer-grid/selected-item/aside/aside-funding.tsx'

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

test('AsideFunding renders nothing when funding is empty', () => {
  const mockState = {
    manifest: {},
  } as unknown as SelectedItemStore

  vi.mocked(useSelectedItemStore).mockImplementation(selector =>
    selector(mockState),
  )

  const Container = () => {
    return <AsideFunding />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('AsideFunding renders with funding data', () => {
  const mockState = {
    manifest: {
      funding: [
        {
          type: 'url',
          url: 'https://www.acme.com/funding1',
        },
        {
          type: 'url',
          url: 'https://www.acme.com/funding2',
        },
      ],
    } as SelectedItemStore['manifest'],
  } as unknown as SelectedItemStore

  vi.mocked(useSelectedItemStore).mockImplementation(selector =>
    selector(mockState),
  )

  const Container = () => {
    return <AsideFunding />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

//const mockBugs = [
//  {
//    url: 'https://www.acme.com/bugs',
//  },
//] satisfies NormalizedBugs
//
//const mockManifest = {
//  homepage: 'https://www.acme.com',
//  license: 'MIT',
//  repository: 'https://www.acme.com',
//  version: '1.0.0',
//  engines: {
//    node: '>=14.0.0',
//  },
//  type: 'module',
//  funding: mockFunding as unknown as FundingEntry[],
//  bugs: mockBugs as unknown as Bugs,
//} satisfies SelectedItemStore['manifest']
//
//const mockVersions = [
//  {
//    version: '1.0.0',
//    unpackedSize: 123456,
//    tarball: 'https://registry.acme.com/tarball-1.0.0.tgz',
//    integrity: 'sha512-abc123',
//  },
//] satisfies SelectedItemStore['versions']
//
//const mockState = {
//  selectedItem: SELECTED_ITEM,
//  manifest: mockManifest,
//  rawManifest: null,
//  packageScore: undefined,
//  insights: undefined,
//  author: undefined,
//  versions: mockVersions,
//  depCount: undefined,
//  setDepCount: vi.fn(),
//  scannedDeps: undefined,
//  setScannedDeps: vi.fn(),
//  depsAverageScore: undefined,
//  setDepsAverageScore: vi.fn(),
//  depLicenses: undefined,
//  setDepLicenses: vi.fn(),
//  depWarnings: undefined,
//  setDepWarnings: vi.fn(),
//  duplicatedDeps: undefined,
//  setDuplicatedDeps: vi.fn(),
//  depFunding: undefined,
//  setDepFunding: vi.fn(),
//  stargazersCount: 100,
//  openIssueCount: '5',
//  openPullRequestCount: '4',
//  ...SELECTED_ITEM_DETAILS,
//} satisfies SelectedItemStore
