import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.js'
import { useSelectedItem } from '@/components/explorer-grid/selected-item/context.jsx'
import {
  VersionsTabButton,
  VersionsTabContent,
} from '@/components/explorer-grid/selected-item/tabs-versions.jsx'
import {
  SELECTED_ITEM,
  SELECTED_ITEM_DETAILS,
} from './__fixtures__/item.ts'
import type { DetailsInfo } from '@/lib/external-info.js'

vi.mock('lucide-react', () => ({
  History: 'gui-history-icon',
  ArrowUpDown: 'gui-arrow-up-down-icon',
  ChevronDown: 'gui-chevron-down-icon',
}))

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

vi.mock('@/components/ui/inline-code.jsx', () => ({
  InlineCode: 'gui-inline-code',
}))

vi.mock('@/components/ui/collapsible.jsx', () => ({
  Collapsible: 'gui-collapsible',
  CollapsibleTrigger: 'gui-collapsible-trigger',
  CollapsibleContent: 'gui-collapsible-content',
}))

vi.mock('@radix-ui/react-avatar', () => ({
  Avatar: 'gui-avatar',
  AvatarImage: 'gui-avatar-image',
  AvatarFallback: 'gui-avatar-fallback',
}))

vi.mock('@/components/ui/button.jsx', () => ({
  Button: 'gui-button',
}))

vi.mock('@/components/ui/copy-to-clipboard.jsx', () => ({
  CopyToClipboard: 'gui-copy-to-clipboard',
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

test('VersionsTabButton renders default', () => {
  vi.mocked(useSelectedItem).mockReturnValue({
    selectedItem: SELECTED_ITEM,
    selectedItemDetails: {
      ...SELECTED_ITEM_DETAILS,
      versions: [
        {
          version: '1.0.0',
          publishedDate: '2025-04-15',
          unpackedSize: 123456,
          integrity: 'sha512-abc123',
          tarball: 'https://example.com/tarball.tgz',
          publishedAuthor: {
            name: 'John Doe',
            email: 'johndoe@acme.com',
            avatar: 'https://example.com/avatar.jpg',
          },
        },
        {
          version: '1.0.2',
          publishedDate: '2025-04-15',
          unpackedSize: 123456,
          integrity: 'sha512-abc123',
          tarball: 'https://example.com/tarball.tgz',
          publishedAuthor: {
            name: 'John Doe',
            email: 'johndoe@acme.com',
            avatar: 'https://example.com/avatar.jpg',
          },
        },
      ],
    } as DetailsInfo,
    insights: undefined,
    activeTab: 'versions',
    setActiveTab: vi.fn(),
  })

  const { container } = render(<VersionsTabButton />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('VersionsTabContent renders with versions', () => {
  vi.mocked(useSelectedItem).mockReturnValue({
    selectedItem: SELECTED_ITEM,
    selectedItemDetails: {
      ...SELECTED_ITEM_DETAILS,
      versions: [
        {
          version: '1.0.0',
          publishedDate: '2025-04-15',
          unpackedSize: 123456,
          integrity: 'sha512-abc123',
          tarball: 'https://example.com/tarball.tgz',
          publishedAuthor: {
            name: 'John Doe',
            email: 'johndoe@acme.com',
            avatar: 'https://example.com/avatar.jpg',
          },
        },
        {
          version: '1.0.2',
          publishedDate: '2025-04-15',
          unpackedSize: 123456,
          integrity: 'sha512-abc123',
          tarball: 'https://example.com/tarball.tgz',
          publishedAuthor: {
            name: 'John Doe',
            email: 'johndoe@acme.com',
            avatar: 'https://example.com/avatar.jpg',
          },
        },
      ],
    } as DetailsInfo,
    insights: undefined,
    activeTab: 'versions',
    setActiveTab: vi.fn(),
  })

  const { container } = render(<VersionsTabContent />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('VersionsTabContent renders an empty state', () => {
  vi.mocked(useSelectedItem).mockReturnValue({
    selectedItem: SELECTED_ITEM,
    selectedItemDetails: {
      ...SELECTED_ITEM_DETAILS,
      greaterVersions: undefined,
      versions: undefined,
    } as DetailsInfo,
    insights: undefined,
    activeTab: 'versions',
    setActiveTab: vi.fn(),
  })

  const { container } = render(<VersionsTabContent />)
  expect(container.innerHTML).toMatchSnapshot()
})
