import { describe, it, expect } from 'vitest'

import {
  isStringUiNode,
  isPseudoUiNode,
  isProjectUiNode,
  isStatePseudo,
  isSecurityPseudo,
  isRelationshipPseudo,
  isFunctionalPseudo,
  isAttributeUiNode,
  isAttributePseudo,
  isCombinatorUiNode,
  isCommaUiNode,
  isIdentifierUiNode,
  isTagUiNode,
} from '@/components/query-builder/utils.ts'
import type {
  UiNode,
  PseudoUiNode,
  AttributeUiNode,
} from '@/components/query-builder/ui-node-types.ts'

describe('query-builder utils type guards', () => {
  it('string node', () => {
    const n: UiNode = { type: 'string', value: 'x' }
    expect(isStringUiNode(n)).toBe(true)
    expect(isPseudoUiNode(n)).toBe(false)
  })

  it('pseudo node basics', () => {
    const n: PseudoUiNode = {
      type: 'pseudo',
      value: ':is',
      children: [{ type: 'tag', value: 'a' }],
    }
    expect(isPseudoUiNode(n)).toBe(true)
    expect(isFunctionalPseudo(n)).toBe(true)
  })

  it('project pseudo', () => {
    const project: PseudoUiNode = {
      type: 'pseudo',
      value: ':project',
    }
    const root: PseudoUiNode = { type: 'pseudo', value: ':root' }
    const workspace: PseudoUiNode = {
      type: 'pseudo',
      value: ':workspace',
    }
    expect(isProjectUiNode(project)).toBe(true)
    expect(isProjectUiNode(root)).toBe(true)
    expect(isProjectUiNode(workspace)).toBe(true)
  })

  it('state and security pseudos', () => {
    const state: PseudoUiNode = {
      type: 'pseudo',
      value: ':outdated',
      children: [{ type: 'string', value: 'true' }],
    }
    const security: PseudoUiNode = {
      type: 'pseudo',
      value: ':abandoned',
    }
    expect(isStatePseudo(state)).toBe(true)
    expect(isSecurityPseudo(security)).toBe(true)
  })

  it('relationship pseudo', () => {
    const rel: PseudoUiNode = { type: 'pseudo', value: ':dev' }
    expect(isRelationshipPseudo(rel)).toBe(true)
  })

  it('attribute pseudo', () => {
    const attr: PseudoUiNode = {
      type: 'pseudo',
      value: ':attr',
      children: [{ type: 'string', value: 'license' }],
    }
    expect(isAttributePseudo(attr)).toBe(true)
  })

  it('attribute node', () => {
    const n: AttributeUiNode = {
      type: 'attribute',
      attribute: 'name',
      value: 'pkg',
    }
    expect(isAttributeUiNode(n)).toBe(true)
  })

  it('combinator node', () => {
    const gt: UiNode = { type: 'combinator', value: '>' }
    const sib: UiNode = { type: 'combinator', value: '~' }
    const desc: UiNode = { type: 'combinator', value: ' ' }
    expect(isCombinatorUiNode(gt)).toBe(true)
    expect(isCombinatorUiNode(sib)).toBe(true)
    expect(isCombinatorUiNode(desc)).toBe(true)
  })

  it('comma token', () => {
    const n: UiNode = { type: 'comma', value: ',' }
    expect(isCommaUiNode(n)).toBe(true)
  })

  it('identifier and tag', () => {
    const id: UiNode = { type: 'id', value: 'foo' }
    const tag: UiNode = { type: 'tag', value: 'a' }
    expect(isIdentifierUiNode(id)).toBe(true)
    expect(isTagUiNode(tag)).toBe(true)
  })

  it('negative cases', () => {
    const emptyId: UiNode = { type: 'id', value: '' as any }
    const wrongComb: UiNode = {
      type: 'combinator',
      value: '+' as any,
    }
    const pseudoNoKids: PseudoUiNode = {
      type: 'pseudo',
      value: ':is',
    }

    expect(isIdentifierUiNode(emptyId)).toBe(false)
    expect(isCombinatorUiNode(wrongComb)).toBe(false)
    expect(isFunctionalPseudo(pseudoNoKids)).toBe(false)
  })
})
