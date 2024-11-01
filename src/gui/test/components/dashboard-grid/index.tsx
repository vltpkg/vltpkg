import { vi, test, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.js'
import { DashboardGrid } from '@/components/dashboard-grid/index.jsx'

vi.mock('@/components/ui/card.jsx', () => ({
  CardTitle: 'gui-card-title',
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

test('dashboard-grid render default', async () => {
  render(<DashboardGrid />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('dashboard-grid with results', async () => {
  const Container = () => {
    const updateDashboard = useStore(state => state.updateDashboard)
    updateDashboard([
      {
        name: 'project-foo',
        path: '/home/user/project-foo',
        manifest: { name: 'project-foo', version: '1.0.0' },
        tools: ['node', 'vlt'],
        mtime: 1730498483044,
      },
      {
        name: 'project-bar',
        path: '/home/user/project-bar',
        manifest: { name: 'project-bar', version: '1.0.0' },
        tools: ['pnpm'],
        mtime: 1730498491029,
      },
    ])
    return <DashboardGrid />
  }
  render(<Container />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})
