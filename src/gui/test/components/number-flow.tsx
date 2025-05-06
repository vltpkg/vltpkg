import React from 'react'
import { test, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { NumberFlow } from '@/components/number-flow.tsx'

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  cleanup()
})

test('number-flow renders default', () => {
  const Container = () => {
    return <NumberFlow start={1} end={1} />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('number-flow renders with custom classes', () => {
  const Container = () => {
    return (
      <NumberFlow
        start={1}
        end={1}
        classNames={{
          wrapper: 'custom-wrapper',
          p: 'custom-p',
          span: 'custom-span',
        }}
      />
    )
  }

  const { container } = render(<Container />)

  const wrapper = container.querySelector(
    '[data-id="number-flow-wrapper"]',
  )!
  expect(wrapper).toBeTruthy()
  expect(wrapper.className).toContain('custom-wrapper')

  const p = container.querySelector('[data-id="number-flow-p"]')!
  expect(p).toBeTruthy()
  expect(p.className).toContain('custom-p')

  const spans = container.querySelectorAll('span')
  expect(spans.length).toBeGreaterThan(0)
  spans.forEach(span => {
    expect(span.className).toContain('custom-span')
  })

  expect(container.innerHTML).toMatchSnapshot()
})

test('number-flow renders with custom padding', () => {
  const Container = () => {
    return <NumberFlow format={{ pad: 0 }} start={1} end={1} />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})
