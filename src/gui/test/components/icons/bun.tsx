import { afterEach, expect, test } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { Bun } from '@/components/icons/index.ts'

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  cleanup()
})

test('bun icon render default', () => {
  render(<Bun />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('bun icon render custom class', () => {
  render(<Bun className="custom-class" />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})
