import { test, expect, vi, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { Header } from '@/components/navigation/marketing-menu/index.tsx'

vi.mock('react-router', () => ({
  NavLink: 'gui-nav-link',
  useLocation: vi.fn().mockReturnValue({
    pathname: '/',
  }),
  useNavigate: vi.fn(() => vi.fn()),
}))

vi.mock('nuqs', () => ({
  useQueryState: vi.fn(() => ['', vi.fn()]),
  parseAsString: {
    withDefault: vi.fn(() => ({})),
  },
}))

vi.mock('@/state/search-results.ts', () => ({
  useSearchResultsStore: vi.fn(selector =>
    selector({
      isLoading: false,
      results: [],
      total: 0,
      error: null,
      query: '',
      fetchResults: vi.fn(),
      setQuery: vi.fn(),
      reset: vi.fn(),
    }),
  ),
}))

vi.mock('lucide-react', () => ({
  Search: 'gui-search-icon',
  Loader2: 'gui-loader-icon',
  Command: 'gui-command-icon',
}))

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="animate-presence">{children}</div>
  ),
  motion: {
    create: (component: unknown) => component,
  },
}))

vi.mock('@/components/hooks/use-keydown.tsx', () => ({
  useKeyDown: vi.fn(),
}))

vi.mock('@/components/ui/input-group.tsx', () => ({
  InputGroup: 'gui-input-group',
  InputGroupInput: 'gui-input-group-input',
  InputGroupAddon: 'gui-input-group-addon',
}))

vi.mock('@/components/ui/kbd.tsx', () => ({
  Kbd: 'gui-kbd',
}))

vi.mock('@/components/icons/index.ts', () => ({
  Vlt: 'gui-vlt-icon',
}))

vi.mock('@/lib/environment.ts', () => ({
  isHostedEnvironment: vi.fn(() => false),
}))

vi.mock('@/components/hooks/use-auth.tsx', () => ({
  useAuth: vi.fn(() => ({
    isSignedIn: false,
  })),
}))

vi.mock('react-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-dom')>('react-dom')
  return {
    ...actual,
    createPortal: (children: React.ReactNode) => children,
  }
})

vi.mock('@/components/ui/button.tsx', () => ({
  Button: 'gui-button',
}))

vi.mock('@/components/hooks/use-scroll.tsx', () => ({
  useScroll: vi.fn(() => false),
}))

vi.mock('@/components/navigation/marketing-menu/data.ts', () => ({
  menuContent: [
    {
      group: 'Products',
      children: [
        {
          label: 'Client',
          subtitle: 'vlt',
          path: 'https://www.vlt.sh/client',
        },
      ],
    },
    { label: 'Docs', path: 'https://docs.vlt.sh/', target: '_blank' },
  ],
}))

vi.mock('@/components/ui/navigation-menu.tsx', () => ({
  NavigationMenu: 'gui-navigation-menu',
  NavigationMenuIndicator: 'gui-navigation-menu-indicator',
  NavigationMenuItem: 'gui-navigation-menu-item',
  NavigationMenuLink: 'gui-navigation-menu-link',
  NavigationMenuList: 'gui-navigation-menu-list',
  NavigationMenuTrigger: 'gui-navigation-menu-trigger',
  NavigationMenuViewport: 'gui-navigation-menu-viewport',
}))

vi.mock('@/components/navigation/marketing-menu/logo.tsx', () => ({
  Logo: 'gui-logo',
}))

vi.mock(
  '@/components/navigation/marketing-menu/menu-group-content.tsx',
  () => ({
    MenuGroupContent: 'gui-menu-group-content',
  }),
)

vi.mock(
  '@/components/navigation/marketing-menu/list-item.tsx',
  () => ({
    ListItem: 'gui-list-item',
  }),
)

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  cleanup()
})

test('renders header on home page', () => {
  const { container } = render(<Header />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('renders header on search page', async () => {
  const { useLocation } = await import('react-router')
  vi.mocked(useLocation).mockReturnValue({
    pathname: '/search',
    search: '',
    hash: '',
    state: null,
    key: 'default',
  })

  const { container } = render(<Header />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('renders header on search page with loading state', async () => {
  const { useLocation } = await import('react-router')
  const { useSearchResultsStore } =
    await import('@/state/search-results.ts')

  vi.mocked(useLocation).mockReturnValue({
    pathname: '/search',
    search: '',
    hash: '',
    state: null,
    key: 'default',
  })

  vi.mocked(useSearchResultsStore).mockImplementation(selector =>
    selector({
      isLoading: true,
      results: [],
      total: 0,
      error: null,
      query: 'react',
      fetchResults: vi.fn(),
      setQuery: vi.fn(),
      reset: vi.fn(),
    }),
  )

  const { container } = render(<Header />)
  expect(container.innerHTML).toMatchSnapshot()
})
