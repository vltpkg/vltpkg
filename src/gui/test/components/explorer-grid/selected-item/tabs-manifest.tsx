import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.js'
import { useSelectedItem } from '@/components/explorer-grid/selected-item/context.jsx'
import {
  TabsManifestButton,
  TabsManifestContent,
} from '@/components/explorer-grid/selected-item/tabs-manifest.jsx'
import {
  SELECTED_ITEM,
  SELECTED_ITEM_DETAILS,
} from './__fixtures__/item.ts'
import type { GridItemData } from '@/components/explorer-grid/types.js'
import type { Manifest } from '@vltpkg/types'

vi.mock(
  '@/components/explorer-grid/selected-item/context.jsx',
  () => ({
    useSelectedItem: vi.fn(),
    SelectedItemProvider: 'gui-selected-item-provider',
  }),
)

vi.mock('@/components/ui/tabs.jsx', () => ({
  TabsTrigger: 'gui-tabs-trigger',
  TabsContent: 'gui-tabs-content',
}))

vi.mock('@/components/ui/shiki.jsx', () => ({
  CodeBlock: 'gui-code-block',
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

test('TabsManifestButton does not render when manifest is not available', () => {
  vi.mocked(useSelectedItem).mockReturnValue({
    selectedItem: SELECTED_ITEM,
    selectedItemDetails: SELECTED_ITEM_DETAILS,
    insights: undefined,
    activeTab: 'manifest',
    setActiveTab: vi.fn(),
  })

  const Container = () => {
    return <TabsManifestButton />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toBe('')
})

test('TabsManifestButton renders default', () => {
  const ITEM_WITH_MANIFEST = {
    ...SELECTED_ITEM,
    to: {
      manifest: {
        name: 'acme-package',
        version: '1.0.0',
        author: 'John Doe',
        private: true,
        dependencies: {
          '@acme/1': '1.0.0',
          '@acme/2': '2.0.0',
        },
        devDependencies: {
          '@acme/3': '3.0.0',
          '@acme/4': '4.0.0',
        },
      } as Manifest,
    },
  } as unknown as GridItemData

  vi.mocked(useSelectedItem).mockReturnValue({
    selectedItem: ITEM_WITH_MANIFEST,
    selectedItemDetails: SELECTED_ITEM_DETAILS,
    insights: undefined,
    activeTab: 'manifest',
    setActiveTab: vi.fn(),
  })

  const Container = () => {
    return <TabsManifestButton />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('TabsManifestContent does not render when manifest is not available', () => {
  vi.mocked(useSelectedItem).mockReturnValue({
    selectedItem: SELECTED_ITEM,
    selectedItemDetails: SELECTED_ITEM_DETAILS,
    insights: undefined,
    activeTab: 'manifest',
    setActiveTab: vi.fn(),
  })

  const Container = () => {
    return <TabsManifestContent />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toBe('')
})

test('TabsManifestContent renders default', () => {
  const ITEM_WITH_MANIFEST = {
    ...SELECTED_ITEM,
    to: {
      manifest: {
        name: 'acme-package',
        version: '1.0.0',
        author: 'John Doe',
        private: true,
        dependencies: {
          '@acme/1': '1.0.0',
          '@acme/2': '2.0.0',
        },
        devDependencies: {
          '@acme/3': '3.0.0',
          '@acme/4': '4.0.0',
        },
      } as Manifest,
    },
  } as unknown as GridItemData

  vi.mocked(useSelectedItem).mockReturnValue({
    selectedItem: ITEM_WITH_MANIFEST,
    selectedItemDetails: SELECTED_ITEM_DETAILS,
    insights: undefined,
    activeTab: 'manifest',
    setActiveTab: vi.fn(),
  })

  const Container = () => {
    return <TabsManifestContent />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})
