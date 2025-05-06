import React from 'react'
import { vi, test, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import { SetupProject } from '@/components/explorer-grid/setup-project.tsx'

vi.mock('react-router', () => ({
  useNavigate: vi.fn(),
}))

vi.mock('@/components/ui/button.tsx', () => ({
  Button: 'gui-button',
}))

vi.mock('@/components/ui/loading-spinner.tsx', () => ({
  LoadingSpinner: 'gui-loading-spinner',
}))

vi.mock('@/components/ui/inline-code.tsx', () => ({
  InlineCode: 'gui-inline-code',
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

test('setup-project', () => {
  const Container = () => {
    return <SetupProject />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})
