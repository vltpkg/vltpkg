import { describe, test, expect } from 'vitest'

import { fromUiTokens } from '@/components/query-builder/ast-stringify.ts'
import type { UiNode } from '@/components/query-builder/ui-node-types.ts'

describe('fromUiTokens', () => {
  test('stringifies simple tag and id', () => {
    const nodes: UiNode[] = [
      { type: 'tag', value: 'a' },
      { type: 'id', value: 'foo' },
    ]
    expect(fromUiTokens(nodes)).toBe('a#foo')
  })

  test('stringifies attribute with operator', () => {
    const nodes: UiNode[] = [
      { type: 'tag', value: 'a' },
      {
        type: 'attribute',
        attribute: 'href',
        value: 'https',
        operator: '^=',
      },
    ]
    expect(fromUiTokens(nodes)).toBe('a[href^=https]')
  })

  test('stringifies attribute with insensitive flag', () => {
    const nodes: UiNode[] = [
      {
        type: 'attribute',
        attribute: 'name',
        value: 'pkg',
        operator: '=',
        flag: 'i',
      },
    ]
    const out = fromUiTokens(nodes)
    // postcss-selector-parser prints the insensitive flag as ` i` before the closing bracket
    expect(out).toContain('[name=pkg')
    expect(out).toContain(' i]')
  })

  test('stringifies combinators with spacing rules', () => {
    const direct: UiNode[] = [
      { type: 'tag', value: 'a' },
      { type: 'combinator', value: '>' },
      { type: 'tag', value: 'b' },
    ]
    expect(fromUiTokens(direct)).toBe('a > b')

    const descendant: UiNode[] = [
      { type: 'tag', value: 'a' },
      { type: 'combinator', value: ' ' },
      { type: 'tag', value: 'b' },
    ]
    expect(fromUiTokens(descendant)).toBe('a b')
  })

  test('stringifies pseudo with children (no comma)', () => {
    const nodes: UiNode[] = [
      {
        type: 'pseudo',
        value: ':is',
        children: [{ type: 'tag', value: 'a' }],
      },
    ]
    expect(fromUiTokens(nodes)).toBe(':is(a)')
  })

  test('stringifies pseudo with children including comma-separated nested selectors', () => {
    const nodes: UiNode[] = [
      {
        type: 'pseudo',
        value: ':is',
        children: [
          { type: 'tag', value: 'a' },
          { type: 'comma', value: ',' },
          { type: 'tag', value: 'b' },
        ],
      },
    ]
    expect(fromUiTokens(nodes)).toBe(':is(a,b)')
  })

  test('uses comma tokens to split top-level selectors and preserves trailing comma', () => {
    const nodes: UiNode[] = [
      { type: 'tag', value: 'a' },
      { type: 'comma', value: ',' },
      { type: 'tag', value: 'b' },
      { type: 'comma', value: ',' },
    ]
    expect(fromUiTokens(nodes)).toBe('a,b,')
  })

  test('ignores selector/root tokens during stringification', () => {
    const nodes: UiNode[] = [
      { type: 'root', value: '' } as UiNode,
      { type: 'selector', value: '' } as UiNode,
      { type: 'tag', value: 'a' },
    ]
    expect(fromUiTokens(nodes)).toBe('a')
  })
})
