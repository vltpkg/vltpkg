import { afterEach, expect, test } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { JavaScript } from '@/components/icons/index.ts'

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  cleanup()
})

test('javascript icon render default', () => {
  render(<JavaScript />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('javascript icon render custom class', () => {
  render(<JavaScript className="custom-class" />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})
