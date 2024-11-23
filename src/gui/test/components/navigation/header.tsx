import { test, expect, afterEach, vi } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.js'
import { Header } from '@/components/navigation/header.jsx'

vi.mock('useGraphStore', () => ({
  useGraphStore: vi.fn(),
}))

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  const CleanUp = () => (useStore(state => state.reset)(), '')
  render(<CleanUp />)
  cleanup()
})

const testCases = new Map<string, string>([
  ['/', 'Dashboard'],
  ['/error', 'Error'],
  ['/explore', 'Explore'],
  ['/dashboard', 'Dashboard'],
])

test.each([...testCases])(
  'renders Header for route %s with expected name %s',
  (routeName, expectedRouteName) => {
    const Container = () => {
      const setRoute = useStore(state => state.updateActiveRoute)
      setRoute(routeName)
      return <Header />
    }

    const { container } = render(<Container />)
    expect(container.innerHTML).toContain(expectedRouteName)
    expect(container.innerHTML).toMatchSnapshot()
  },
)
