import { afterEach, expect, test } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { Node } from '@/components/icons/index.ts'

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  cleanup()
})

test('node icon render default', () => {
  render(<Node />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('node icon render custom class', () => {
  render(<Node className="custom-class" />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})
