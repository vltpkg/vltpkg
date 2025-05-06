import { test, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { Input } from '@/components/ui/input.tsx'

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  cleanup()
})

test('input render default', async () => {
  render(<Input />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('input render with type', async () => {
  render(<Input type="search" />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('input render with custom classname', async () => {
  render(<Input className="custom-class" />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})
