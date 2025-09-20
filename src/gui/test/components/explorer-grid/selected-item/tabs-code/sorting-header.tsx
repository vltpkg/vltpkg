import { test, expect, afterEach, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { SortingHeader } from '@/components/explorer-grid/selected-item/tabs-code/sorting-header.tsx'
import { Files } from 'lucide-react'

vi.mock('lucide-react', () => ({
  ChevronDown: 'gui-chevron-down',
  ChevronUp: 'gui-chevron-up',
  Files: 'gui-files-icon',
}))

vi.mock('@/components/ui/button.tsx', () => ({
  Button: 'gui-button',
}))

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  cleanup()
})

test('SortingHeader renders with icon and asc dir', () => {
  const { container } = render(
    <SortingHeader
      label="File"
      dir={'asc'}
      icon={Files}
      onClick={vi.fn()}
    />,
  )
  expect(container.innerHTML).toMatchSnapshot()
})

test('SortingHeader renders without icon and desc dir', () => {
  const { container } = render(
    <SortingHeader label="Size" dir={'desc'} onClick={vi.fn()} />,
  )
  expect(container.innerHTML).toMatchSnapshot()
})
