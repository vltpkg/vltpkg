import { test, expect, vi, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import { CreateNewProject } from '@/app/create-new-project.tsx'

vi.mock('react-router', () => ({
  useNavigate: vi.fn(),
}))

vi.mock('@/components/create-new-project/index.tsx', () => ({
  CreateNewProjectContent: 'gui-create-new-project-content',
}))

vi.mock('@/components/ui/inline-code.tsx', () => ({
  InlineCode: 'gui-inline-code',
}))

vi.mock('@/components/ui/loading-spinner.tsx', () => ({
  LoadingSpinner: 'gui-loading-spinner',
}))

vi.mock('@/lib/start-data.ts', () => ({
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
