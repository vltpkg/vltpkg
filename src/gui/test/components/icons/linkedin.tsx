import { afterEach, expect, test } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { Linkedin } from '@/components/icons/linkedin.jsx'

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  cleanup()
})

test('linkedin icon render default', () => {
  render(<Linkedin />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('linkedin icon render custom class', () => {
  render(<Linkedin className="custom-class" />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})
