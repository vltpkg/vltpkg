import { afterEach, expect, test } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { Config } from '@/components/icons/index.ts'

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  cleanup()
})

test('config icon render default', () => {
  render(<Config />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('config icon render custom class', () => {
  render(<Config className="custom-class" />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})
