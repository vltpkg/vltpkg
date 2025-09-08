import { vi, test, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import { BreadcrumbHeader } from '@/components/navigation/header/breadcrumb-header.tsx'
import { useLocation } from 'react-router'

import type { Location } from 'react-router'

vi.mock('react-router', () => ({
  useNavigate: vi.fn(),
  useLocation: vi.fn(),
}))

vi.mock('lucide-react', () => ({
  ChevronRight: 'gui-chevron-right-icon',
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

test('BreadcrumbHeader renders with a single route', () => {
  vi.mocked(useLocation).mockReturnValue({
    pathname: '/settings',
  } as Location)

  const Container = () => {
    return <BreadcrumbHeader />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('BreadcrumbHeader renders with multiple routes', () => {
  vi.mocked(useLocation).mockReturnValue({
    pathname: '/settings/general',
  } as Location)

  const Container = () => {
    return <BreadcrumbHeader />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})
