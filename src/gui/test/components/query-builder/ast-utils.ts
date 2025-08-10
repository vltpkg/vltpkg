import { describe, test, expect } from 'vitest'
import type { PostcssNode } from '@vltpkg/dss-parser'
import { tag, id, pseudo } from 'postcss-selector-parser'

import {
  toUiNodeFromPostcss,
  createSelector,
  createRoot,
  appendToSelector,
  appendToPseudo,
} from '@/components/query-builder/ast-utils.ts'

describe('ast-utils', () => {
  test('toUiNodeFromPostcss converts simple nodes', () => {
    const node = toUiNodeFromPostcss({
      type: 'tag',
      value: 'a',
    } as unknown as PostcssNode)
    expect(node).toEqual({ type: 'tag', value: 'a' })

    const comb = toUiNodeFromPostcss({
      type: 'combinator',
      value: '>',
    } as unknown as PostcssNode)
    expect(comb).toEqual({ type: 'combinator', value: '>' })
  })

  test('appendToSelector builds a selector string', () => {
    const sel = createSelector()
    appendToSelector(sel, tag({ value: 'a' }))
    appendToSelector(sel, id({ value: 'foo' }))
    const out = (
      sel as unknown as { toString: () => string }
    ).toString()
    expect(out).toBe('a#foo')
  })

  test('appendToPseudo builds :is(a)', () => {
    const p = pseudo({ value: ':is' })
    appendToPseudo(p, tag({ value: 'a' }))
    const out = (
      p as unknown as { toString: () => string }
    ).toString()
    expect(out).toBe(':is(a)')
  })

  test('createRoot + createSelector can form a selector list', () => {
    const root = createRoot()

    const s1 = createSelector()
    appendToSelector(s1, tag({ value: 'a' }))
    ;(root as unknown as { append: (n: unknown) => void }).append(s1)

    const s2 = createSelector()
    appendToSelector(s2, tag({ value: 'b' }))
    ;(root as unknown as { append: (n: unknown) => void }).append(s2)

    const out = (
      root as unknown as { toString: () => string }
    ).toString()
    expect(out).toBe('a,b')
  })
})
