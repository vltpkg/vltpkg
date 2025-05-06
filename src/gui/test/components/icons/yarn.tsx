import { afterEach, expect, test } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { Yarn } from '@/components/icons/index.ts'

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  cleanup()
})

test('yarn icon render default', () => {
  render(<Yarn />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('yarn icon render custom class', () => {
  render(<Yarn className="custom-class" />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})
