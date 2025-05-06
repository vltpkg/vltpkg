import React from 'react'
import { beforeAll, afterEach, test, vi, expect } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import { routes } from '@/routes.tsx'

vi.mock('react-router', async () => {
  const actual = await import('react-router')
  return {
    ...actual,
    createBrowserRouter: vi.fn(),
  }
})

vi.mock('@/components/navigation/header.tsx', () => ({
  Header: 'gui-header',
}))
vi.mock('@/components/navigation/footer.tsx', () => ({
  Footer: 'gui-footer',
}))
vi.mock('@/components/navigation/sidebar/index.tsx', () => ({
  defaultOpen: true,
  AppSidebar: 'gui-app-sidebar',
}))
vi.mock('@/components/ui/sidebar.tsx', () => ({
  SidebarProvider: 'gui-sidebar-provider',
  SidebarInset: 'gui-sidebar-inset',
}))
vi.mock('@/components/ui/toaster.tsx', () => ({
  Toaster: 'gui-toaster',
}))
vi.mock('@/components/hooks/use-preflight.tsx', () => ({
  usePreflight: vi.fn(),
}))

vi.mock('@/layout.tsx', async importOriginal => {
  const actual = await importOriginal<typeof import('@/layout.tsx')>()

  return {
    default: ({
      children,
      ...props
    }: {
      children?: React.ReactNode
    }) =>
      React.createElement(
        'gui-layout' as 'div',
        null,
        <actual.default {...props} />,
      ),
  }
})

vi.mock('@/app/create-new-project.tsx', () => ({
  CreateNewProject: 'gui-create-new-project',
}))
vi.mock('@/app/dashboard.tsx', () => ({
  Dashboard: 'gui-dashboard',
}))
vi.mock('@/app/error-found.tsx', () => ({
  ErrorFound: 'gui-error-found',
}))
vi.mock('@/app/explorer.tsx', () => ({
  Explorer: 'gui-explorer',
}))
vi.mock('@/app/labels.tsx', () => ({
  Labels: 'gui-labels',
}))
vi.mock('@/app/queries.tsx', () => ({
  Queries: 'gui-queries',
}))
vi.mock('@/app/help/help-selectors.tsx', () => ({
  HelpSelectors: 'gui-help-selectors',
}))

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
})

afterEach(() => {
  const CleanUp = () => (useStore(state => state.reset)(), '')
  render(<CleanUp />)
  cleanup()
})

const renderWithRouter = (initialRoute: string) => {
  const router = createMemoryRouter(routes, {
    initialEntries: [initialRoute],
  })
  return render(<RouterProvider router={router} />)
}

test('renders Layout for the "/" view', () => {
  const { container } = renderWithRouter('/')
  expect(container.innerHTML).toMatchSnapshot()
})

test('renders Layout for the "/create-new-project" view', () => {
  const { container } = renderWithRouter('/create-new-project')
  expect(container.innerHTML).toMatchSnapshot()
})

test('renders Layout for the "/explore" view', () => {
  const { container } = renderWithRouter('/explore')
  expect(container.innerHTML).toMatchSnapshot()
})

test('renders Layout for the "/queries" view', () => {
  const { container } = renderWithRouter('/queries')
  expect(container.innerHTML).toMatchSnapshot()
})

test('renders Layout for the "/labels" view', () => {
  const { container } = renderWithRouter('/labels')
  expect(container.innerHTML).toMatchSnapshot()
})

test('renders Layout for the "/error" view', () => {
  const { container } = renderWithRouter('/error')
  expect(container.innerHTML).toMatchSnapshot()
})

test('renders Layout for the "/help" view', () => {
  const { container } = renderWithRouter('/help')
  expect(container.innerHTML).toMatchSnapshot()
})

test('renders Layout for the "/help/selectors" view', () => {
  const { container } = renderWithRouter('/help/selectors')
  expect(container.innerHTML).toMatchSnapshot()
})
