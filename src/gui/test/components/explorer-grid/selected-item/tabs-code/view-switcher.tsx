import { test, expect, afterEach, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { ViewSwitcher } from '@/components/explorer-grid/selected-item/tabs-code/view-switcher.tsx'

vi.mock('lucide-react', () => ({
  Heading1: 'gui-heading1-icon',
  Code: 'gui-code-icon',
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

test('ViewSwitcher renders with code active', () => {
  const { container } = render(
    <ViewSwitcher activeView="code" setView={vi.fn()} />,
  )
  expect(container.innerHTML).toMatchSnapshot()
})

test('ViewSwitcher renders with preview active', () => {
  const { container } = render(
    <ViewSwitcher activeView="preview" setView={vi.fn()} />,
  )
  expect(container.innerHTML).toMatchSnapshot()
})
