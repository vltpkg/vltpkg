import { afterEach, expect, test } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { VltClient } from '@/components/icons/index.ts'

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  cleanup()
})

test('vlt-client icon render default', () => {
  render(<VltClient />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('vlt-client icon render custom class', () => {
  render(<VltClient className="custom-class" />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})
