import { test, expect, afterEach, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { LoadingState } from '@/components/explorer-grid/selected-item/tabs-code/loading-state.tsx'

vi.mock('@/components/ui/jelly-spinner.tsx', () => ({
  JellyTriangleSpinner: 'gui-jelly-triangle-spinner',
}))

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  cleanup()
})

test('LoadingState renders spinner container', () => {
  const { container } = render(<LoadingState />)
  expect(container.innerHTML).toMatchSnapshot()
})
