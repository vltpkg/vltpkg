import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import { useSelectedItemStore } from '@/components/explorer-grid/selected-item/context.tsx'
import { ContributorTabContent } from '@/components/explorer-grid/selected-item/tabs-contributors.tsx'
import {
  SELECTED_ITEM,
  SELECTED_ITEM_DETAILS,
  MOCK_LOADING_STATE,
} from './__fixtures__/item.ts'

import type { SelectedItemStore } from '@/components/explorer-grid/selected-item/context.tsx'
import type { Contributor } from '@/lib/external-info.ts'

vi.mock(
  '@/components/explorer-grid/selected-item/context.tsx',
  () => ({
    useSelectedItemStore: vi.fn(),
    SelectedItemProvider: 'gui-selected-item-provider',
    useTabNavigation: vi.fn(() => ({
      tab: 'contributors',
      subTab: undefined,
      setActiveTab: vi.fn(),
      setActiveSubTab: vi.fn(),
    })),
  }),
)

vi.mock('@/components/ui/button.tsx', () => ({
  Button: 'gui-button',
}))

vi.mock('lucide-react', () => ({
  ArrowLeft: 'gui-arrow-left-icon',
  UsersRound: 'gui-users-round-icon',
  CircleHelp: 'gui-circle-help-icon',
}))

vi.mock('@radix-ui/react-avatar', () => ({
  Avatar: 'gui-avatar',
  AvatarImage: 'gui-avatar-image',
  AvatarFallback: 'gui-avatar-fallback',
}))

vi.mock(
  '@/components/explorer-grid/selected-item/tabs-dependencies/empty-state.tsx',
  () => ({
    EmptyState: 'gui-empty-state',
  }),
)

vi.mock('@/components/ui/button.tsx', () => ({
  Button: 'gui-button',
}))

vi.mock(
  '@/components/explorer-grid/selected-item/empty-state.tsx',
  () => ({
    SelectedItemEmptyState: 'gui-selected-item-empty-state',
  }),
)

vi.mock('@/components/ui/tooltip.jsx', () => ({
  Tooltip: 'gui-tooltip',
  TooltipPortal: 'gui-tooltip-portal',
  TooltipContent: 'gui-tooltip-content',
  TooltipProvider: 'gui-tooltip-provider',
  TooltipTrigger: 'gui-tooltip-trigger',
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

const mockContributors = [
  {
    avatar: 'https://acme.com/avatar.png',
    name: 'John Doe',
    email: 'johndoe@acme.com',
  },
  {
    avatar: 'https://acme.com/avatar.png',
    name: 'Jane Doe',
    email: 'janedoe@acme.com',
  },
  {
    avatar: 'https://acme.com/avatar.png',
    name: 'John Smith',
    email: 'johnsmith@acme.com',
  },
  {
    avatar: 'https://acme.com/avatar.png',
    name: 'Sarah Davis',
    email: 'sarahdavis@acme.com',
  },
  {
    avatar: 'https://acme.com/avatar.png',
    name: 'Laura Brown',
    email: 'laurabrown@acme.com',
  },
  {
    avatar: 'https://acme.com/avatar.png',
    name: 'Anna Miller',
    email: 'annamiller@acme.com',
  },

  {
    avatar: 'https://acme.com/avatar.png',
    name: 'Rachel Wilson',
    email: 'rachelwilson@acme.com',
  },
] satisfies Contributor[]

test('ContributorTabContent renders with contributors', () => {
  const mockState = {
    selectedItem: SELECTED_ITEM,
    ...SELECTED_ITEM_DETAILS,
    manifest: {},
    rawManifest: null,
    contributors: mockContributors.slice(0, 4),
    insights: undefined,
    depCount: undefined,
    setDepCount: vi.fn(),
    scannedDeps: undefined,
    setScannedDeps: vi.fn(),
    depsAverageScore: undefined,
    setDepsAverageScore: vi.fn(),
    depLicenses: undefined,
    setDepLicenses: vi.fn(),
    depWarnings: undefined,
    setDepWarnings: vi.fn(),
    duplicatedDeps: undefined,
    setDuplicatedDeps: vi.fn(),
    depFunding: undefined,
    setDepFunding: vi.fn(),
    ...MOCK_LOADING_STATE,
  } satisfies SelectedItemStore

  vi.mocked(useSelectedItemStore).mockImplementation(selector =>
    selector(mockState),
  )

  const Container = () => {
    return <ContributorTabContent />
  }
  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('ContributorTabContent renders with no contributors', () => {
  const mockState = {
    selectedItem: SELECTED_ITEM,
    ...SELECTED_ITEM_DETAILS,
    manifest: {},
    rawManifest: null,
    contributors: undefined,
    insights: undefined,
    depCount: undefined,
    setDepCount: vi.fn(),
    scannedDeps: undefined,
    setScannedDeps: vi.fn(),
    depsAverageScore: undefined,
    setDepsAverageScore: vi.fn(),
    depLicenses: undefined,
    setDepLicenses: vi.fn(),
    depWarnings: undefined,
    setDepWarnings: vi.fn(),
    duplicatedDeps: undefined,
    setDuplicatedDeps: vi.fn(),
    depFunding: undefined,
    setDepFunding: vi.fn(),
    ...MOCK_LOADING_STATE,
  } satisfies SelectedItemStore

  vi.mocked(useSelectedItemStore).mockImplementation(selector =>
    selector(mockState),
  )

  const Container = () => {
    return <ContributorTabContent />
  }
  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})
