import { vi, test, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.js'
import { Header } from '@/components/navigation/header.jsx'
import { useLocation } from 'react-router'
import type { Location } from 'react-router'

vi.mock('react-router', () => ({
  useLocation: vi.fn(),
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

const testCases = [
  ['/', 'Dashboard'],
  ['/error', null],
  ['/create-new-project', null],
  ['/explore', 'Explore'],
  ['/queries', 'Queries'],
  ['/labels', 'Labels'],
]

test.each(testCases)(
  'renders Header for route %s with expected name %s',
  (routeName, expectedRouteName) => {
    vi.mocked(useLocation).mockReturnValue({
      pathname: routeName,
    } as Location)
    const { container } = render(<Header />)

    if (expectedRouteName === null) {
      expect(container.innerHTML).toBe('')
    } else {
      expect(container.innerHTML).toContain(expectedRouteName)
    }

    expect(container.innerHTML).toMatchSnapshot()
  },
)
