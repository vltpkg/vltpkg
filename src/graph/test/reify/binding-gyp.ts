import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { PathScurry } from 'path-scurry'
import t from 'tap'
import type { Node } from '../../src/node.ts'
import { hasBindingGyp } from '../../src/reify/binding-gyp.ts'

const dir = t.testdir({
  gyp: { 'binding.gyp': '{}' },
  plain: {},
  'x.tgz': '',
})
const node = (name: string) =>
  ({
    resolvedLocation: () => resolve(dir, name),
  }) as unknown as Node
const scurry = new PathScurry(dir)

t.test('checked on disk', async t => {
  t.equal(hasBindingGyp(node('gyp'), scurry), true)
  t.equal(hasBindingGyp(node('plain'), scurry), false)
})

t.test('location is a file', async t => {
  t.equal(hasBindingGyp(node('x.tgz'), scurry), false)
})

t.test('past a stale path cache', async t => {
  t.equal(scurry.lstatSync('plain/binding.gyp'), undefined)
  writeFileSync(resolve(dir, 'plain/binding.gyp'), '{}')
  t.equal(scurry.lstatSync('plain/binding.gyp'), undefined, 'stale')
  t.equal(hasBindingGyp(node('plain'), scurry), true)
})
