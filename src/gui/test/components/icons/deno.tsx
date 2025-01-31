import { afterEach, expect, test } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { Deno } from '@/components/icons/index.js'

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  cleanup()
})

test('deno icon render default', () => {
  render(<Deno />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('deno icon render custom class', () => {
  render(<Deno className="custom-class" />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})
