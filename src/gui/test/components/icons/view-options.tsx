import { afterEach, expect, test } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { ViewOptions } from '@/components/icons/index.ts'

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  cleanup()
})

test('viewOptions icon render default', () => {
  render(<ViewOptions />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('viewOptions icon render custom class', () => {
  render(<ViewOptions className="custom-class" />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})
