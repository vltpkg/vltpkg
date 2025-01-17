import { afterEach, expect, test } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { VLTV } from '@/components/icons/vlt-v.jsx'

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  cleanup()
})

test('vlt v icon render default', () => {
  render(<VLTV />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('vlt v icon render custom class', () => {
  render(<VLTV className="custom-class" />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})
