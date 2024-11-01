import { vi, test, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.js'
import { ErrorFound } from '@/app/error-found.jsx'

vi.mock('@/components/ui/logo.jsx', () => ({
  Logo: 'gui-logo',
}))
vi.mock('@/components/ui/title.jsx', () => ({
  Title: 'gui-title',
}))
vi.mock('@/components/ui/button.jsx', () => ({
  Button: 'gui-button',
}))
vi.mock('@/components/ui/theme-switcher.jsx', () => ({
  ThemeSwitcher: 'gui-theme-switcher',
}))
vi.mock('lucide-react', () => ({
  BatteryLow: 'gui-battery-low-icon',
  LayoutDashboard: 'gui-layout-dashboard-icon',
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

test('render default', async () => {
  render(<ErrorFound />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('error-found has a cause', async () => {
  const Container = () => {
    const updateErrorCause = useStore(state => state.updateErrorCause)
    updateErrorCause('Failed because of...')
    return <ErrorFound />
  }
  render(<Container />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})
