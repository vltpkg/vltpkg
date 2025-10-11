import { vi, test, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import { SignIn } from '@/app/auth/sign-in.tsx'

import { useAuth } from '@/components/hooks/use-auth.tsx'

const mockNavigate = vi.fn()
const mockSignIn = vi.fn()

vi.mock('react-router', () => ({
  useNavigate: vi.fn(() => mockNavigate),
}))

vi.mock('@/components/hooks/use-auth.tsx', () => ({
  useAuth: vi.fn(() => ({
    signIn: mockSignIn,
    isSignedIn: false,
  })),
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

test('render default', async () => {
  render(<SignIn />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('render when already signed in', async () => {
  ;(
    useAuth as unknown as ReturnType<typeof vi.fn>
  ).mockReturnValueOnce({
    signIn: mockSignIn,
    isSignedIn: true,
  })
  render(<SignIn />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})
