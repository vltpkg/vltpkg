import { afterEach, expect, test } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { Vlt } from '@/components/icons/index.js'

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  cleanup()
})

test('vlt icon render default', () => {
  render(<Vlt />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('vlt icon render custom class', () => {
  render(<Vlt className="custom-class" />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})
