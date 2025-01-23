import { vi, test, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.js'
import { ErrorFound } from '@/app/error-found.jsx'

vi.mock('@/components/ui/button.jsx', () => ({
  Button: 'gui-button',
}))
vi.mock('lucide-react', () => ({
  ArrowRight: 'gui-arrow-right-icon',
  TriangleAlert: 'gui-triangle-alert-icon',
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
