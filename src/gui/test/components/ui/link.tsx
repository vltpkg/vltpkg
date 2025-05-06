import { vi, test, expect, afterEach } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import html from 'diffable-html'
import React from 'react'
import { Link } from '@/components/ui/link.tsx'

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

test('link render default', () => {
  const Container = () => {
    return <Link>gui-link</Link>
  }
  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('link renders with href', () => {
  const Container = () => {
    return <Link href="https://www.acme.com">gui-link-acme</Link>
  }
  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('link renders with custom className', () => {
  const Container = () => {
    return <Link className="custom-class">gui-link</Link>
  }
  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('link renders with additional props', () => {
  const Container = () => {
    return (
      <Link
        href="https://example.com"
        title="Example Link"
        data-testid="test-link"
        rel="noopener noreferrer">
        gui-link
      </Link>
    )
  }
  const { container } = render(<Container />)
  const link = screen.getByTestId('test-link')

  expect(container.innerHTML).toMatchSnapshot()
  expect(link.getAttribute('href')).toBe('https://example.com')
  expect(link.getAttribute('title')).toBe('Example Link')
  expect(link.getAttribute('rel')).toBe('noopener noreferrer')
  expect(link.getAttribute('target')).toBe('_blank')
})

test('link renders with ref', () => {
  const Container = () => {
    const ref = React.useRef<HTMLAnchorElement>(null)
    return <Link ref={ref}>gui-link</Link>
  }
  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('link renders with complex children', () => {
  const Container = () => {
    return (
      <Link>
        <span>Nested</span>
        <strong>Content</strong>
      </Link>
    )
  }
  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})
