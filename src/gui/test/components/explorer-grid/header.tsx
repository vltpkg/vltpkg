import { test, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { GridHeader } from '@/components/explorer-grid/header.tsx'

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  cleanup()
})

test('grid header render default', async () => {
  render(<GridHeader>Some text content</GridHeader>)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('grid header render custom class', async () => {
  render(
    <GridHeader className="custom-class">
      With a custom class
    </GridHeader>,
  )
  expect(window.document.body.innerHTML).toMatchSnapshot()
})
