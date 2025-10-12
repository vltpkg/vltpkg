import { vi, test, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { HostedWarning } from '@/components/hosted-warning.tsx'

vi.mock('react-router', () => ({
  Link: 'gui-router-link',
}))

vi.mock('@/components/ui/inline-code.tsx', () => ({
  InlineCode: 'gui-inline-code',
}))

vi.mock('@/components/ui/button.tsx', () => ({
  Button: 'gui-button',
}))

vi.mock('lucide-react', () => ({
  ArrowUpRight: 'gui-arrow-up-right-icon',
}))

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  cleanup()
})

test('HostedWarning view', () => {
  const Container = () => {
    return <HostedWarning />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})
