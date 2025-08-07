import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import { useSelectedItemStore } from '@/components/explorer-grid/selected-item/context.tsx'
import { AsideMetadata } from '@/components/explorer-grid/selected-item/aside/aside-metadata.tsx'

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

vi.mock('lucide-react', () => ({
  CircleFadingArrowUp: 'gui-circle-fading-arrow-up',
  Download: 'gui-download',
  FileLock2: 'gui-file-lock2',
  Package: 'gui-package',
}))

vi.mock('@/components/icons/index.ts', () => ({
  Node: 'gui-node',
  Npm: 'gui-npm',
  Yarn: 'gui-yarn',
  Pnpm: 'gui-pnpm',
  Deno: 'gui-deno',
  Bun: 'gui-bun',
}))

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

test('AsideMetadata renders nothing when there is no metadata', () => {
  const mockState = {
    manifest: {},
    versions: [],
  } as unknown as SelectedItemStore

  vi.mocked(useSelectedItemStore).mockImplementation(selector =>
    selector(mockState),
  )

  const Container = () => {
    return <AsideMetadata />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('AsideMetadata renders with all metadata', () => {
  const mockState = {
    manifest: {
      version: '1.0.0',
      type: 'module',
      engines: {
        node: '>=14.0.0',
        npm: '>=6.0.0',
      },
    } as SelectedItemStore['manifest'],
    versions: [
      {
        version: '1.0.0',
        tarball: 'https://registry.acme.com/tarball.tgz',
        integrity: 'sha512-abc123',
        unpackedSize: 1024,
      },
    ] as SelectedItemStore['versions'],
  } as unknown as SelectedItemStore

  vi.mocked(useSelectedItemStore).mockImplementation(selector =>
    selector(mockState),
  )

  const Container = () => {
    return <AsideMetadata />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})
