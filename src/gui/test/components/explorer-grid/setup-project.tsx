import React from 'react'
import { vi, test, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.js'
import { SetupProject } from '@/components/explorer-grid/setup-project.jsx'

vi.mock('@/components/ui/button.jsx', () => ({
  Button: 'gui-button',
}))

vi.mock('@/components/ui/card.jsx', () => ({
  Card: 'gui-card',
}))

vi.mock('@/components/ui/loading-spinner.jsx', () => ({
  LoadingSpinner: 'gui-loading-spinner',
}))

vi.mock('lucide-react', () => ({
  Download: 'gui-download',
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
