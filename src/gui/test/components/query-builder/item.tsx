import { vi, expect, afterEach, describe, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import { Item } from '@/components/query-builder/item.tsx'
import type {
  UiNode,
  AttributeUiNode,
  PseudoUiNode,
} from '@/components/query-builder/ui-node-types.ts'

vi.mock('@/components/ui/button.tsx', () => ({
  Button: 'gui-button',
}))

vi.mock('lucide-react', () => ({
  X: 'gui-x-icon',
}))

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  const CleanUp = () => (useStore(state => state.reset)(), '')
  render(<CleanUp />)
  cleanup()
})

const noop = () => {}

describe('Item', () => {
  it('renders tag node', () => {
    const node: UiNode = { type: 'tag', value: 'a' }
    const { container } = render(<Item node={node} onDelete={noop} />)
    expect(container.innerHTML).toMatchSnapshot()
  })

  it('renders id node as identifier', () => {
    const node: UiNode = { type: 'id', value: 'foo' }
    const { container } = render(<Item node={node} onDelete={noop} />)
    expect(container.innerHTML).toMatchSnapshot()
  })

  it('renders attribute node', () => {
    const node: AttributeUiNode = {
      type: 'attribute',
      attribute: 'name',
      value: 'pkg',
    }
    const { container } = render(<Item node={node} onDelete={noop} />)
    expect(container.innerHTML).toMatchSnapshot()
  })

  it('renders combinator node', () => {
    const node: UiNode = { type: 'combinator', value: '>' }
    const { container } = render(<Item node={node} onDelete={noop} />)
    expect(container.innerHTML).toMatchSnapshot()
  })

  it('renders functional pseudo :is with child', () => {
    const node: PseudoUiNode = {
      type: 'pseudo',
      value: ':is',
      children: [{ type: 'tag', value: 'a' }],
    }
    const { container } = render(<Item node={node} onDelete={noop} />)
    expect(container.innerHTML).toMatchSnapshot()
  })

  it('renders attribute pseudo :attr with child string', () => {
    const node: PseudoUiNode = {
      type: 'pseudo',
      value: ':attr',
      children: [{ type: 'string', value: 'license' }],
    }
    const { container } = render(<Item node={node} onDelete={noop} />)
    expect(container.innerHTML).toMatchSnapshot()
  })

  it('renders state pseudo :outdated with child string', () => {
    const node: PseudoUiNode = {
      type: 'pseudo',
      value: ':outdated',
      children: [{ type: 'string', value: 'true' }],
    }
    const { container } = render(<Item node={node} onDelete={noop} />)
    expect(container.innerHTML).toMatchSnapshot()
  })

  it('renders relationship pseudo :dev', () => {
    const node: PseudoUiNode = { type: 'pseudo', value: ':dev' }
    const { container } = render(<Item node={node} onDelete={noop} />)
    expect(container.innerHTML).toMatchSnapshot()
  })

  it('renders comma token as group label', () => {
    const node: UiNode = { type: 'comma', value: ',' }
    const { container } = render(<Item node={node} onDelete={noop} />)
    expect(container.innerHTML).toMatchSnapshot()
  })
})
