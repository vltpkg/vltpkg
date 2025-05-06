import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import type { SelectedItemStore } from '@/components/explorer-grid/selected-item/context.tsx'
import { useSelectedItemStore } from '@/components/explorer-grid/selected-item/context.tsx'
import {
  OverviewTabButton,
  OverviewTabContent,
} from '@/components/explorer-grid/selected-item/tabs-overview.tsx'
import {
  SELECTED_ITEM,
  SELECTED_ITEM_DETAILS,
} from './__fixtures__/item.ts'
import type { GridItemData } from '@/components/explorer-grid/types.ts'
import type { DetailsInfo } from '@/lib/external-info.ts'

const ITEM_WITH_DESCRIPTION = {
  ...SELECTED_ITEM,
  to: {
    name: 'item',
    version: '1.0.0',
    id: ['registry', 'custom', 'item@1.0.0'],
    manifest: {
      description: '## Description\n\nThis is a custom description',
    },
    rawManifest: null,
  },
} as unknown as GridItemData

const ITEM_DETAILS_WITH_AUTHOR = {
  ...SELECTED_ITEM_DETAILS,
  author: {
    name: 'John Doe',
    mail: 'johndoe@acme.com',
    email: 'johndoe@acme.com',
    url: 'https://acme.com/johndoe',
    web: 'https://acme.com/johndoe',
  },
} as unknown as DetailsInfo

vi.mock(
  '@/components/explorer-grid/selected-item/context.tsx',
  () => ({
    useSelectedItemStore: vi.fn(),
    SelectedItemProvider: 'gui-selected-item-provider',
  }),
)

vi.mock('@/components/ui/tabs.tsx', () => ({
  TabsTrigger: 'gui-tabs-trigger',
  TabsContent: 'gui-tabs-content',
}))

vi.mock('react-markdown', () => ({
  default: 'gui-markdown',
}))

vi.mock('lucide-react', () => ({
  FileText: 'gui-file-text-icon',
  Globe: 'gui-globe-icon',
  Bug: 'gui-bug-icon',
  RectangleHorizontal: 'gui-rectangle-horizontal-icon',
  Star: 'gui-star-icon',
  CircleDot: 'gui-circle-dot-icon',
  GitPullRequest: 'gui-git-pull-request-icon',
  Link: 'gui-link-icon',
}))

vi.mock('@/components/icons/index.ts', () => ({
  Github: 'gui-github-icon',
}))

vi.mock('@/components/ui/data-badge.tsx', () => ({
  DataBadge: 'gui-data-badge',
}))

vi.mock('@/components/ui/link.tsx', () => ({
  Link: 'gui-link',
}))

vi.mock('@radix-ui/react-avatar', () => ({
  Avatar: 'gui-avatar',
  AvatarImage: 'gui-avatar-image',
  AvatarFallback: 'gui-avatar-fallback',
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

test('OverviewTabButton renders default', () => {
  const mockState = {
    selectedItem: SELECTED_ITEM,
    ...SELECTED_ITEM_DETAILS,
    manifest: {},
    rawManifest: null,
    insights: undefined,
    activeTab: 'overview' as const,
    setActiveTab: vi.fn(),
  } satisfies SelectedItemStore

  vi.mocked(useSelectedItemStore).mockImplementation(selector =>
    selector(mockState),
  )

  const Container = () => {
    return <OverviewTabButton />
  }

  const { container } = render(<Container />)

  expect(container.innerHTML).toMatchSnapshot()
})

test('OverviewTabContent renders default', () => {
  const mockState = {
    selectedItem: SELECTED_ITEM,
    ...SELECTED_ITEM_DETAILS,
    manifest: {},
    rawManifest: null,
    insights: undefined,
    activeTab: 'overview' as const,
    setActiveTab: vi.fn(),
  } satisfies SelectedItemStore

  vi.mocked(useSelectedItemStore).mockImplementation(selector =>
    selector(mockState),
  )

  const Container = () => {
    return <OverviewTabContent />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('OverviewTabContent renders with content', () => {
  const mockState = {
    selectedItem: ITEM_WITH_DESCRIPTION,
    ...ITEM_DETAILS_WITH_AUTHOR,
    insights: undefined,
    activeTab: 'overview' as const,
    setActiveTab: vi.fn(),
    rawManifest: null,
    manifest: {
      description: '## Description\n\nThis is a custom description',
      keywords: ['testing', 'vitest'],
    },
  } satisfies SelectedItemStore

  vi.mocked(useSelectedItemStore).mockImplementation(selector =>
    selector(mockState),
  )

  const Container = () => {
    return <OverviewTabContent />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('OverviewTabContent renders with an aside and content', () => {
  const mockState = {
    selectedItem: ITEM_WITH_DESCRIPTION,
    ...ITEM_DETAILS_WITH_AUTHOR,
    insights: undefined,
    activeTab: 'overview' as const,
    setActiveTab: vi.fn(),
    rawManifest: null,
    contributors: [
      {
        name: 'John Doe',
        email: 'johndoe@acme.com',
        avatar: 'https://acme.com/johndoe',
      },
      {
        name: 'Jane Doo',
        email: 'janedoo@acme.com',
        avatar: 'https://acme.com/janedoo',
      },
    ],
    stargazersCount: 100,
    openIssueCount: '10',
    openPullRequestCount: '5',
    manifest: {
      homepage: 'https://acme.com',
      repository: {
        type: 'git',
        url: 'github.com/acme/repo.git',
      },
      bugs: {
        url: 'https://acme.com/bugs',
      },
      funding: {
        url: 'https://acme.com/funding',
      },
    },
  } satisfies SelectedItemStore

  vi.mocked(useSelectedItemStore).mockImplementation(selector =>
    selector(mockState),
  )

  const Container = () => {
    return <OverviewTabContent />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})
