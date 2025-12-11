import {
  test,
  expect,
  vi,
  describe,
  beforeEach,
  afterEach,
} from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import { useSelectedItemStore } from '@/components/explorer-grid/selected-item/context.tsx'
import {
  handleQueryContributor,
  ContributorTabContent,
} from '@/components/explorer-grid/selected-item/tabs-contributors.tsx'
import {
  SELECTED_ITEM,
  SELECTED_ITEM_DETAILS,
  MOCK_LOADING_STATE,
  MOCK_STORE_STATE,
  MOCK_STORE_ACTIONS,
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
    ...MOCK_STORE_STATE,
    manifest: {},
    contributors: mockContributors.slice(0, 4),
    ...MOCK_STORE_ACTIONS,
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
    scannedDeps: undefined,
    depsAverageScore: undefined,
    depLicenses: undefined,
    depWarnings: undefined,
    duplicatedDeps: undefined,
    depFunding: undefined,
    ...MOCK_STORE_ACTIONS,
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

describe('handleQueryContributor', () => {
  test('it handles names with spaces', () => {
    let query = ''
    const updateQuery = vi.fn(newQuery => {
      query = newQuery
    })

    const contributor = {
      name: 'john doe',
    } satisfies Contributor

    handleQueryContributor({ contributor, updateQuery })

    expect(query).toBe(":attr(contributors, [name='john doe'])")
  })

  test('it handles emails with +', () => {
    let query = ''
    const updateQuery = vi.fn(newQuery => {
      query = newQuery
    })

    const contributor = {
      email: 'spartan-117+johndoe@cortana.com',
      name: 'john doe',
    } satisfies Contributor

    handleQueryContributor({ contributor, updateQuery })

    expect(query).toBe(
      ":attr(contributors, [email='spartan-117+johndoe@cortana.com'])",
    )
  })

  test('it prioritizes emails over names when both are present', () => {
    let query = ''
    const updateQuery = vi.fn(newQuery => {
      query = newQuery
    })

    const contributor = {
      email: 'spartan-117+johndoe@cortana.com',
      name: 'john doe',
    } satisfies Contributor

    handleQueryContributor({ contributor, updateQuery })

    expect(query).toBe(
      ":attr(contributors, [email='spartan-117+johndoe@cortana.com'])",
    )
  })
})
