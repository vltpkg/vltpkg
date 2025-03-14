import { test, expect, vi, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.js'
import { CreateNewProject } from '@/app/create-new-project.jsx'

vi.mock('react-router', () => ({
  useNavigate: vi.fn(),
}))

vi.mock('@/components/create-new-project/index.jsx', () => ({
  CreateNewProjectContent: 'gui-create-new-project-content',
}))

vi.mock('@/components/ui/inline-code.jsx', () => ({
  InlineCode: 'gui-inline-code',
}))

vi.mock('@/components/ui/loading-spinner.jsx', () => ({
  LoadingSpinner: 'gui-loading-spinner',
}))

vi.mock('@/lib/start-dashboard-data.js', () => ({
  startDashboardData: vi.fn(),
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
  const { container } = render(<CreateNewProject />)
  expect(container.innerHTML).toMatchSnapshot()
})
