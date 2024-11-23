import { afterEach, test, vi, expect } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.js'
import Layout from '@/layout.jsx'

vi.mock('useGraphStore', () => ({
  useGraphStore: vi.fn(),
}))

vi.mock('@/components/navigation/header.jsx', () => ({
  Header: () => <div>Mock Header</div>,
}))
vi.mock('@/components/navigation/footer.jsx', () => ({
  Footer: () => <div>Mock Footer</div>,
}))
vi.mock('@/components/navigation/sidebar.jsx', () => ({
  Sidebar: () => <div>Mock Sidebar</div>,
}))
vi.mock('@/app/dashboard.jsx', () => ({
  Dashboard: () => <div>Mock Dashboard</div>,
}))
vi.mock('@/app/explorer.jsx', () => ({
  Explorer: () => <div>Mock Explorer</div>,
}))
vi.mock('@/app/error-found.jsx', () => ({
  ErrorFound: () => <div>Mock Error Found</div>,
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

test('renders Layout for the "/dashboard" view', () => {
  const Container = () => {
    const setRoute = useStore(state => state.updateActiveRoute)
    setRoute('/dashboard')
    return <Layout />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('renders Layout for the "/explore" view', () => {
  const Container = () => {
    const setRoute = useStore(state => state.updateActiveRoute)
    setRoute('/explore')
    return <Layout />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('renders Layout for the "/error" view', () => {
  const Container = () => {
    const setRoute = useStore(state => state.updateActiveRoute)
    setRoute('/error')
    return <Layout />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})
