import { vi, test, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.js'
import { Header } from '@/components/navigation/header.jsx'
import { useLocation } from 'react-router'
import type { Location } from 'react-router'
import type { State } from '@/state/types.js'

vi.mock('react-router', () => ({
  useLocation: vi.fn(),
}))

vi.mock('@/components/ui/inline-code.jsx', () => ({
  InlineCode: 'gui-inline-code',
}))

vi.mock('lucide-react', () => ({
  ChevronRight: 'gui-chevron-right-icon',
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
  ['/help', 'Help'],
  ['/help/selectors', 'Help'],
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

test('header renders with context value on `/explore`', () => {
  vi.mocked(useLocation).mockReturnValue({
    pathname: '/explore',
  } as Location)
  const Container = () => {
    const updateDashboard = useStore(state => state.updateDashboard)
    const updateGraph = useStore(state => state.updateGraph)

    updateDashboard({
      buildVersion: '1.0.0',
    } as unknown as State['dashboard'])
    updateGraph({
      projectRoot: '/foo/bar/baz',
    } as unknown as State['graph'])

    return <Header />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toContain('/foo/bar/baz')
  expect(container.innerHTML).toContain('1.0.0')
  expect(container.innerHTML).toMatchSnapshot()
})
