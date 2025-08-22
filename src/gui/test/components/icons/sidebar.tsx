import { afterEach, expect, test } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { Sidebar } from '@/components/icons/index.ts'

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  cleanup()
})

test('sidebar icon render default', () => {
  render(<Sidebar />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('sidebar icon render custom class', () => {
  render(<Sidebar className="custom-class" />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})
