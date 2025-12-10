import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { normalizeManifest } from '@vltpkg/types'
import { useGraphStore as useStore } from '@/state/index.ts'
import { useSelectedItemStore } from '@/components/explorer-grid/selected-item/context.tsx'
import { TabsJsonContent } from '@/components/explorer-grid/selected-item/tabs-json.tsx'
import {
  SELECTED_ITEM,
  SELECTED_ITEM_DETAILS,
  MOCK_LOADING_STATE,
  MOCK_STORE_STATE,
  MOCK_STORE_ACTIONS,
} from './__fixtures__/item.ts'

import type { SelectedItemStore } from '@/components/explorer-grid/selected-item/context.tsx'

const MOCK_MANIFEST = normalizeManifest({
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
})

vi.mock(
  '@/components/explorer-grid/selected-item/context.tsx',
  () => ({
    useSelectedItemStore: vi.fn(),
    SelectedItemProvider: 'gui-selected-item-provider',
    useTabNavigation: {
      tab: 'json',
      subTab: undefined,
      setActiveTab: vi.fn(),
      setActiveSubTab: vi.fn(),
    },
  }),
)

vi.mock('@/components/ui/tabs.tsx', () => ({
  TabsTrigger: 'gui-tabs-trigger',
  TabsContent: 'gui-tabs-content',
}))

vi.mock('@/components/ui/code-block.tsx', () => ({
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

test('TabsManifestContent renders with a json object', () => {
  const mockState = {
    selectedItem: SELECTED_ITEM,
    ...MOCK_STORE_STATE,
    ...SELECTED_ITEM_DETAILS,
    manifest: MOCK_MANIFEST,
    ...MOCK_STORE_ACTIONS,
    ...MOCK_LOADING_STATE,
  } satisfies SelectedItemStore

  vi.mocked(useSelectedItemStore).mockImplementation(selector =>
    selector(mockState),
  )

  const Container = () => {
    return <TabsJsonContent />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})
