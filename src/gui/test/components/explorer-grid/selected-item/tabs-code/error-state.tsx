import { test, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { ErrorState } from '@/components/explorer-grid/selected-item/tabs-code/error-state.tsx'

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  cleanup()
})

test('ErrorState renders a single error', () => {
  const { container } = render(
    <ErrorState
      errors={[
        { origin: 'Code explorer', cause: 'Something went wrong' },
      ]}
    />,
  )
  expect(container.innerHTML).toMatchSnapshot()
})

test('ErrorState renders multiple errors', () => {
  const { container } = render(
    <ErrorState
      errors={[
        { origin: 'Code explorer', cause: 'Failed to load' },
        { origin: 'Hydrate code path', cause: 'Aborted' },
      ]}
    />,
  )
  expect(container.innerHTML).toMatchSnapshot()
})
