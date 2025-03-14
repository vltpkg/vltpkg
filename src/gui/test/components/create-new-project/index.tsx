import { vi, test, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.js'
import { CreateNewProjectContent } from '@/components/create-new-project/index.jsx'

vi.mock('react-router', () => ({
  useNavigate: vi.fn(),
}))

vi.mock('@/components/ui/input.jsx', () => ({
  Input: 'gui-input',
}))

vi.mock('@/components/ui/button.jsx', () => ({
  Button: 'gui-button',
}))

vi.mock('@/components/ui/form-label.jsx', () => ({
  Label: 'gui-label',
}))

vi.mock('@/components/grid/grid.jsx', () => ({
  Grid: 'gui-grid',
  System: 'gui-grid-system',
  Cell: 'gui-grid-cell',
}))

vi.mock('@/components/icons/index.js', () => ({
  Next: 'gui-next-icon',
  Vercel: 'gui-vercel-icon',
  Nuxt: 'gui-nuxt-icon',
  Node: 'gui-node-icon',
}))

vi.mock('@/components/animated-beam.jsx', () => ({
  AnimatedBeam: 'gui-animated-beam',
}))

vi.mock('@/components/directory-select.jsx', () => ({
  DirectorySelect: 'gui-directory-select',
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

test('create-new-project-content render default', async () => {
  const mockSetInProgress = vi.fn()
  const mockInProgress = false

  render(
    <CreateNewProjectContent
      setInProgress={mockSetInProgress}
      inProgress={mockInProgress}
    />,
  )
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('create-new-project-content with results', async () => {
  const mockSetInProgress = vi.fn()
  const mockInProgress = false

  const Container = () => {
    const updateDashboard = useStore(state => state.updateDashboard)
    updateDashboard({
      buildVersion: '1.0.0',
      cwd: '/path/to/cwd',
      defaultAuthor: 'Ruy Adorno',
      dashboardProjectLocations: [
        { path: '/home/user', readablePath: '~' },
      ],
      projects: [
        {
          name: 'project-foo',
          readablePath: '~/project-foo',
          path: '/home/user/project-foo',
          manifest: { name: 'project-foo', version: '1.0.0' },
          tools: ['node', 'vlt'],
          mtime: 1730498483044,
        },
        {
          name: 'project-bar',
          readablePath: '~/project-foo',
          path: '/home/user/project-bar',
          manifest: { name: 'project-bar', version: '1.0.0' },
          tools: ['pnpm'],
          mtime: 1730498491029,
        },
      ],
    })
    return (
      <CreateNewProjectContent
        setInProgress={mockSetInProgress}
        inProgress={mockInProgress}
      />
    )
  }
  render(<Container />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})
