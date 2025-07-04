import { afterEach, expect, test } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { Vsr } from '@/components/icons/index.ts'

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  cleanup()
})

test('vsr icon render default', () => {
  render(<Vsr />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('vsr icon render custom class', () => {
  render(<Vsr className="custom-class" />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})
