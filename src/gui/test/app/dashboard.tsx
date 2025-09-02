import {
  test,
  expect,
  vi,
  afterAll,
  afterEach,
  beforeAll,
} from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import { Dashboard } from '@/app/dashboard.tsx'

vi.mock('react-router', () => ({
  useNavigate: vi.fn(),
}))
vi.mock('@/components/dashboard-grid/index.tsx', () => ({
  DashboardGrid: 'gui-dashboard-grid',
}))

vi.mock('@/components/ui/alert-dialog.tsx', () => ({
  AlertDialog: 'gui-alert-dialog',
  AlertDialogAction: 'gui-alert-dialog-action',
  AlertDialogCancel: 'gui-alert-dialog-cancel',
  AlertDialogContent: 'gui-alert-dialog-content',
  AlertDialogDescription: 'gui-alert-dialog-description',
  AlertDialogFooter: 'gui-alert-dialog-footer',
  AlertDialogHeader: 'gui-alert-dialog-header',
  AlertDialogTitle: 'gui-alert-dialog-title',
}))

vi.mock('@/components/ui/skeleton.tsx', () => ({
  Skeleton: 'gui-skeleton',
}))

vi.mock('@/components/hooks/use-dashboard-root-check.tsx', () => {
  const useDashboardRootCheck = vi.fn(() => ({
    hasDashboard: true,
    isLoading: false,
    dashboardRoots: ['/user/project-foo', '/user/project-bar'],
  }))
  return { useDashboardRootCheck }
})

import { useDashboardRootCheck } from '@/components/hooks/use-dashboard-root-check.tsx'

export const restHandlers = [
  http.get('/dashboard.json', () => {
    return HttpResponse.json([
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
  }),
]

const server = setupServer(...restHandlers)

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

beforeAll(() => server.listen())

afterEach(() => {
  server.resetHandlers()
  const CleanUp = () => (useStore(state => state.reset)(), '')
  render(<CleanUp />)
  cleanup()
  vi.clearAllMocks()
})

afterAll(() => server.close())

test('render default', async () => {
  render(<Dashboard />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('render when loading and no dashboard', async () => {
  ;(useDashboardRootCheck as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
    hasDashboard: false,
    isLoading: true,
    dashboardRoots: [],
  })
  render(<Dashboard />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('render when dashboard present with empty roots', async () => {
  ;(useDashboardRootCheck as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
    hasDashboard: true,
    isLoading: false,
    dashboardRoots: [],
  })
  render(<Dashboard />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})
