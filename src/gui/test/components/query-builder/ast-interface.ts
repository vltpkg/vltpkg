import { describe, test, expect } from 'vitest'

import {
  constructUiAst,
  constructQuery,
  createNodeFromToken,
} from '@/components/query-builder/ast-interface.ts'
import type { QueryBuilderToken } from '@/components/query-builder/options.ts'
import type { UiNode } from '@/components/query-builder/ui-node-types.ts'

const mkToken = (
  type: UiNode['type'],
  token: string,
): QueryBuilderToken => ({
  type,
  token,
  label: token,
  description: `${type} ${token}`,
})

describe('createNodeFromToken', () => {
  test('creates string node', () => {
    const node = createNodeFromToken({
      token: mkToken('string', 'hello'),
    })
    expect(node).toEqual({ type: 'string', value: 'hello' })
  })

  test('creates pseudo node without args', () => {
    const node = createNodeFromToken({
      token: mkToken('pseudo', ':is'),
    })
    expect(node).toEqual({ type: 'pseudo', value: ':is' })
  })

  test('creates pseudo node with args using values or token fallback', () => {
    const node = createNodeFromToken({
      token: mkToken('pseudo', ':score'),
      arguments: [
        { value: '<=0.5' },
        { token: mkToken('string', 'maintenance') },
        {},
      ],
    })
    expect(node.type).toBe('pseudo')
    expect(node).toMatchObject({ value: ':score' })
    expect((node as any).children).toEqual([
      { type: 'string', value: '<=0.5' },
      { type: 'string', value: 'maintenance' },
      { type: 'string', value: '' },
    ])
  })

  test('creates attribute node', () => {
    const node = createNodeFromToken({
      token: mkToken('attribute', 'name'),
    })
    expect(node).toEqual({
      type: 'attribute',
      value: 'name',
      attribute: 'name',
    })
  })

  test('creates root, id, combinator, tag nodes', () => {
    expect(
      createNodeFromToken({ token: mkToken('root', ':root') }),
    ).toEqual({
      type: 'root',
      value: ':root',
    })

    expect(
      createNodeFromToken({ token: mkToken('id', 'pkg') }),
    ).toEqual({
      type: 'id',
      value: 'pkg',
    })

    expect(
      createNodeFromToken({ token: mkToken('combinator', '>') }),
    ).toEqual({
      type: 'combinator',
      value: '>',
    })

    expect(
      createNodeFromToken({ token: mkToken('tag', 'a') }),
    ).toEqual({
      type: 'tag',
      value: 'a',
    })
  })

  test('throws on unsupported token type', () => {
    const bad: QueryBuilderToken = {
      ...mkToken('string', 'x'),
      type: 'selector',
    }
    expect(() => createNodeFromToken({ token: bad })).toThrow(
      /Unsupported token type: selector/,
    )
  })
})

describe('constructQuery/from tokens', () => {
  test('stringifies simple nodes', () => {
    const nodes: UiNode[] = [{ type: 'tag', value: 'a' }]
    expect(constructQuery(nodes)).toBe('a')
  })

  test('stringifies id, attribute, and combinator with spacing', () => {
    const nodes: UiNode[] = [
      { type: 'tag', value: 'a' },
      { type: 'id', value: 'foo' },
      {
        type: 'attribute',
        attribute: 'href',
        value: 'https',
        operator: '^=',
      },
      { type: 'combinator', value: '>' },
      { type: 'tag', value: 'b' },
    ]
    expect(constructQuery(nodes)).toBe('a#foo[href^=https] > b')
  })

  test('stringifies pseudo with children', () => {
    const nodes: UiNode[] = [
      {
        type: 'pseudo',
        value: ':is',
        children: [{ type: 'tag', value: 'a' }],
      },
    ]
    expect(constructQuery(nodes)).toBe(':is(a)')
  })

  test('uses comma tokens to split selectors', () => {
    const nodes: UiNode[] = [
      { type: 'tag', value: 'a' },
      { type: 'comma', value: ',' },
      { type: 'tag', value: 'b' },
    ]
    expect(constructQuery(nodes)).toBe('a,b')
  })
})

describe('constructUiAst', () => {
  test('returns undefined for empty string', () => {
    expect(constructUiAst('')).toBeUndefined()
  })

  test('parses a complex selector list and round-trips', () => {
    const input = 'a#foo[href="bar"] > b, c'
    const ast = constructUiAst(input)
    expect(ast).toBeDefined()
    // round-trip through constructQuery
    const output = constructQuery(ast!)
    expect(output).toBe('a#foo[href=bar] > b,c')
  })

  test('preserves trailing comma as draft token', () => {
    const ast = constructUiAst('a,')
    expect(ast).toBeDefined()
    // last token should be a comma draft token
    expect(ast![ast!.length - 1]).toEqual({
      type: 'comma',
      value: ',',
    })
    // and stringification preserves trailing comma
    expect(constructQuery(ast!)).toBe('a,')
  })
})
