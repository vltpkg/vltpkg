import { afterEach, test, vi, expect } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.js'
import Layout from '@/layout.jsx'

vi.mock('@/components/navigation/header.jsx', () => ({
  Header: 'gui-nav-header',
}))
vi.mock('@/components/navigation/footer.jsx', () => ({
  Footer: 'gui-nav-footer',
}))
vi.mock('@/components/navigation/sidebar.jsx', () => ({
  Sidebar: 'gui-nav-sidebar',
}))
vi.mock('@/app/dashboard.jsx', () => ({
  Dashboard: 'gui-dashboard',
}))
vi.mock('@/app/explorer.jsx', () => ({
  Explorer: 'gui-explorer',
}))
vi.mock('@/app/error-found.jsx', () => ({
  ErrorFound: 'gui-error-found',
}))
vi.mock('@/components/ui/toaster.jsx', () => ({
  Toaster: 'gui-toaster',
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