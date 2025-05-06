import { test, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { LoadingSpinner } from '@/components/ui/loading-spinner.tsx'

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  cleanup()
})

test('loading-spinner render default', async () => {
  const Container = () => <LoadingSpinner />
  render(<Container />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})
