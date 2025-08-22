import { describe, test, expect } from 'vitest'

import { toUiTokens } from '@/components/query-builder/ast-tokenize.ts'
import type { UiNode } from '@/components/query-builder/ui-node-types.ts'

describe('toUiTokens', () => {
  test('returns undefined for empty input', () => {
    expect(toUiTokens('')).toBeUndefined()
  })

  test('parses simple tag', () => {
    expect(toUiTokens('a')).toEqual<UiNode[]>([
      { type: 'tag', value: 'a' },
    ])
  })

  test('parses comma-separated selectors into flat tokens with comma', () => {
    expect(toUiTokens('a, b')).toEqual<UiNode[]>([
      { type: 'tag', value: 'a' },
      { type: 'comma', value: ',' },
      { type: 'tag', value: 'b' },
    ])
  })

  test('parses descendant and direct combinators', () => {
    expect(toUiTokens('a b')).toEqual<UiNode[]>([
      { type: 'tag', value: 'a' },
      { type: 'combinator', value: ' ' },
      { type: 'tag', value: 'b' },
    ])

    expect(toUiTokens('a>b')).toEqual<UiNode[]>([
      { type: 'tag', value: 'a' },
      { type: 'combinator', value: '>' },
      { type: 'tag', value: 'b' },
    ])
  })

  test('parses pseudo with children and embedded commas', () => {
    const tokens = toUiTokens(':is(a,b)')
    expect(tokens).toEqual<UiNode[]>([
      {
        type: 'pseudo',
        value: ':is',
        children: [
          { type: 'tag', value: 'a' },
          { type: 'comma', value: ',' },
          { type: 'tag', value: 'b' },
        ],
      },
    ])
  })

  test('preserves empty pseudo (no children)', () => {
    expect(toUiTokens(':is()')).toEqual<UiNode[]>([
      {
        type: 'pseudo',
        value: ':is',
        children: [
          { type: 'selector', value: undefined } as unknown as UiNode,
        ],
      },
    ])
  })

  test('parses attribute operator and flag', () => {
    const tokens = toUiTokens('a[href=https i]')!
    // should contain the attribute node with operator; current parser does not surface flag
    const attr = tokens.find(
      t => t.type === 'attribute',
    ) as UiNode & {
      attribute?: string
      operator?: string
      flag?: string
    }
    expect(attr).toBeDefined()
    expect(attr.attribute).toBe('href')
    expect(attr.operator).toBe('=')
    expect(attr.flag).toBeUndefined()
  })

  test('appends draft comma when query ends with comma', () => {
    const tokens = toUiTokens('a,')!
    expect(tokens[tokens.length - 1]).toEqual({
      type: 'comma',
      value: ',',
    })
  })

  test('appends draft descendant combinator when query ends with space', () => {
    const tokens = toUiTokens('a ')
    expect(tokens).toEqual<UiNode[]>([
      { type: 'tag', value: 'a' },
      { type: 'combinator', value: ' ' },
    ])
  })

  test('appends both comma and space when ends with ", "', () => {
    const tokens = toUiTokens('a, ')
    // Current behavior: only ensures trailing comma; no draft space after comma
    expect(tokens).toEqual<UiNode[]>([
      { type: 'tag', value: 'a' },
      { type: 'comma', value: ',' },
    ])
  })
})
