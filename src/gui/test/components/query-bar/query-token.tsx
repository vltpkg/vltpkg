import { test, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { QueryToken } from '@/components/query-bar/query-token.tsx'
import { useGraphStore as useStore } from '@/state/index.ts'

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  const CleanUp = () => (useStore(state => state.reset)(), '')
  render(<CleanUp />)
  cleanup()
})

test('query-token render default', () => {
  const Container = () => {
    return <QueryToken>query string</QueryToken>
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('query-token renders pseudo selector', () => {
  const Container = () => {
    return <QueryToken variant="pseudo">:root</QueryToken>
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('query-token renders attribute selector', () => {
  const Container = () => {
    return (
      <QueryToken variant="attribute">[name="my-package"]</QueryToken>
    )
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('query-token renders class selector', () => {
  const Container = () => {
    return <QueryToken variant="class">.my-class</QueryToken>
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('query-token renders id selector', () => {
  const Container = () => {
    return <QueryToken variant="id">#my-id</QueryToken>
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('query-token renders combinator selector', () => {
  const Container = () => {
    return <QueryToken variant="combinator">{` > `}</QueryToken>
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})
