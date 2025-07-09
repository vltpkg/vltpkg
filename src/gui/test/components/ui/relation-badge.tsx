import { test, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { RelationBadge } from '@/components/ui/relation-badge.tsx'

import type { Relation } from '@/components/ui/relation-badge.tsx'

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  cleanup()
})

const relations: Relation[] = [
  'dev',
  'undefined',
  'optional',
  'workspace',
  'prod',
  'peerOptional',
  'peer',
]

test.each(relations)('RelationBadge renders %s', relation => {
  const Container = () => (
    <RelationBadge variant="default" relation={relation}>
      {relation}
    </RelationBadge>
  )
  const { container } = render(<Container />)

  expect(container.innerHTML).toMatchSnapshot()
})

test('RelationBadge renders default', () => {
  const Container = () => (
    <RelationBadge variant="default" relation="prod">
      Production Dependency
    </RelationBadge>
  )
  const { container } = render(<Container />)

  expect(container.innerHTML).toMatchSnapshot()
})

test('RelationBadge renders as a marker', () => {
  const Container = () => (
    <RelationBadge variant="marker" relation="prod">
      Production Dependency
    </RelationBadge>
  )
  const { container } = render(<Container />)

  expect(container.innerHTML).toMatchSnapshot()
})
