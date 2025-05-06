import { vi, test, describe, it, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { DataBadge } from '@/components/ui/data-badge.tsx'
import { Smile } from 'lucide-react'

vi.mock('lucide-react', () => ({
  Copy: 'gui-copy-icon',
  Check: 'gui-check-icon',
  Smile: 'gui-smile-icon',
}))

vi.mock('@/components/ui/tooltip.tsx', () => ({
  Tooltip: 'gui-tooltip',
  TooltipContent: 'gui-tooltip-content',
  TooltipTrigger: 'gui-tooltip-trigger',
  TooltipProvider: 'gui-tooltip-provider',
}))

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  cleanup()
})

test('data-badge render default', () => {
  const Container = () => <DataBadge content="content" />

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('data-badge renders with a tooltip', () => {
  const Container = () => (
    <DataBadge
      tooltip={{ content: 'tooltip-content' }}
      content="content"
    />
  )

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('data-badge renders with an icon', () => {
  const Container = () => <DataBadge icon={Smile} content="content" />

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('data-badge renders with a value', () => {
  const Container = () => <DataBadge value="123" content="content" />

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('data-badge renders with a copyToClipboard', () => {
  const Container = () => (
    <DataBadge
      copyToClipboard={{ copyValue: '123' }}
      value="123"
      content="content"
    />
  )

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('data-badge renders with all options', () => {
  const Container = () => (
    <DataBadge
      icon={Smile}
      tooltip={{ content: 'tooltip-content', delayDuration: 125 }}
      copyToClipboard={{ copyValue: '123' }}
      value="123"
      content="content"
    />
  )

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('data-badge renders with custom classnames', () => {
  const Container = () => (
    <DataBadge
      icon={Smile}
      tooltip={{ content: 'tooltip-content', delayDuration: 125 }}
      copyToClipboard={{ copyValue: '123' }}
      value="123"
      content="content"
      classNames={{
        wrapperClassName: 'custom-wrapper',
        iconClassName: 'custom-icon',
        contentClassName: 'custom-content',
        valueClassName: 'custom-value',
      }}
    />
  )

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('data-badge renders with variants', () => {
  const Container = () => (
    <DataBadge variant="mono" content="content" />
  )

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

describe('data-badge accepts css properties through style props', () => {
  it('data-badge value accepts custom styles', () => {
    const Container = () => (
      <DataBadge
        styles={{
          valueStyles: {
            '--dark-background': 'vitest-style-test',
          } as React.CSSProperties,
        }}
        variant="mono"
        content="content"
        value="vitest-mock-value"
      />
    )

    const { container } = render(<Container />)
    const badgeValue: HTMLElement = container.querySelector(
      '[data-id="info-badge-value"]',
    )!

    expect(container.innerHTML).toMatchSnapshot()
    expect(
      badgeValue.style.getPropertyValue('--dark-background'),
    ).toBe('vitest-style-test')
  })
})
