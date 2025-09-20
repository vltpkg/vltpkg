import { test, expect, afterEach, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { EmptyState } from '@/components/explorer-grid/selected-item/tabs-code/empty-state.tsx'

vi.mock('lucide-react', () => ({
  FileCode2: 'gui-file-code2-icon',
}))

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  cleanup()
})

test('EmptyState renders default', () => {
  const { container } = render(<EmptyState />)
  expect(container.innerHTML).toMatchSnapshot()
})
