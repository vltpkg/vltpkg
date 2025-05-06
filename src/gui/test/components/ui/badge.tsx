import { test, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { Badge } from '@/components/ui/badge.tsx'

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  cleanup()
})

test('badge render default', async () => {
  render(<Badge />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('badge render secondary', async () => {
  render(<Badge variant="secondary" />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('badge render destructive', async () => {
  render(<Badge variant="destructive" />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('badge render outline', async () => {
  render(<Badge variant="outline" />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('badge render custom class', async () => {
  render(<Badge className="custom-class" />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})
