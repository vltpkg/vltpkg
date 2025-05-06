import { test, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { Toaster } from '@/components/ui/toaster.tsx'

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  cleanup()
})

test('toaster render default', async () => {
  const Container = () => <Toaster />
  render(<Container />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})
