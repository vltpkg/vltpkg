import { test, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { Logo } from '@/components/ui/logo.jsx'

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  cleanup()
})

test('logo render default', async () => {
  render(<Logo />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('logo render custom class', async () => {
  render(<Logo className="custom-class" />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})
