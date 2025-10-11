import { vi, test, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import { UserLinearMenu } from '@/components/auth/user-linear-menu.tsx'
import { useAuth } from '@/components/hooks/use-auth.tsx'

const mockNavigate = vi.fn()
const mockSignIn = vi.fn()
const mockSignOut = vi.fn()

vi.mock('react-router', () => ({
  useNavigate: vi.fn(() => mockNavigate),
}))

vi.mock('lucide-react', () => ({
  User: 'gui-user-icon',
  LogOut: 'gui-log-out-icon',
  BookOpen: 'gui-book-open-icon',
}))

vi.mock('@/components/icons/index.ts', () => ({
  Config: 'gui-config-icon',
  Github: 'gui-github-icon',
}))

vi.mock('@/components/hooks/use-auth.tsx', () => ({
  useAuth: vi.fn(() => ({
    isSignedIn: false,
    user: null,
    signIn: mockSignIn,
    signOut: mockSignOut,
  })),
}))

vi.mock('@/components/ui/tooltip.tsx', () => ({
  Tooltip: 'gui-tooltip',
  TooltipPortal: 'gui-tooltip-portal',
  TooltipContent: 'gui-tooltip-content',
  TooltipTrigger: 'gui-tooltip-trigger',
  TooltipProvider: 'gui-tooltip-provider',
}))

vi.mock('@/components/ui/dropdown-menu.tsx', () => ({
  DropdownMenu: 'gui-dropdown-menu',
  DropdownMenuLabel: 'gui-dropdown-menu-label',
  DropdownMenuItem: 'gui-dropdown-menu-item',
  DropdownMenuGroup: 'gui-dropdown-menu-group',
  DropdownMenuSeparator: 'gui-dropdown-menu-separator',
  DropdownMenuTrigger: 'gui-dropdown-menu-trigger',
  DropdownMenuContent: 'gui-dropdown-menu-content',
}))

vi.mock('@/components/ui/button.tsx', () => ({
  Button: 'gui-button',
}))

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  const CleanUp = () => (useStore(state => state.reset)(), '')
  render(<CleanUp />)
  cleanup()
  vi.clearAllMocks()
})

test('render default not signed in', async () => {
  render(<UserLinearMenu />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('render when signed in', async () => {
  ;(
    useAuth as unknown as ReturnType<typeof vi.fn>
  ).mockReturnValueOnce({
    isSignedIn: true,
    user: {
      firstName: 'John',
      lastName: 'Doe',
      username: 'johndoe',
      email: 'john@example.com',
      fullName: 'John Doe',
    },
    signIn: mockSignIn,
    signOut: mockSignOut,
  })
  render(<UserLinearMenu />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('render when signed in with user image', async () => {
  ;(
    useAuth as unknown as ReturnType<typeof vi.fn>
  ).mockReturnValueOnce({
    isSignedIn: true,
    user: {
      firstName: 'Jane',
      lastName: 'Smith',
      username: 'janesmith',
      email: 'jane@example.com',
      fullName: 'Jane Smith',
      imageUrl: 'https://example.com/avatar.jpg',
    },
    signIn: mockSignIn,
    signOut: mockSignOut,
  })
  render(<UserLinearMenu />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('render when signed in with username only', async () => {
  ;(
    useAuth as unknown as ReturnType<typeof vi.fn>
  ).mockReturnValueOnce({
    isSignedIn: true,
    user: {
      username: 'testuser',
      email: 'test@example.com',
    },
    signIn: mockSignIn,
    signOut: mockSignOut,
  })
  render(<UserLinearMenu />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})
