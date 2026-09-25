import { PackageJson } from '@vltpkg/package-json'
import type { NormalizedManifest } from '@vltpkg/types'
import { resolve } from 'node:path'
import { PathScurry } from 'path-scurry'
import t from 'tap'
import type { Diff } from '../../src/diff.ts'
import type { Node } from '../../src/node.ts'
import { checkNeededBuild } from '../../src/reify/check-needed-build.ts'

const dir = t.testdir({
  gyp: {
    'package.json': JSON.stringify({ name: 'gyp', version: '1.0.0' }),
    'binding.gyp': '{}',
  },
  plain: {
    'package.json': JSON.stringify({
      name: 'plain',
      version: '1.0.0',
    }),
  },
})

const node = (
  name: string,
  props: {
    manifest?: NormalizedManifest
    bindingGyp?: boolean
    built?: boolean
  } = {},
) =>
  ({
    id: `··${name}@1.0.0`,
    built: false,
    importer: false,
    inVltStore: () => true,
    resolvedLocation: () => resolve(dir, name),
    ...props,
  }) as unknown as Node

// fails any disk read, to prove the node's own data was used
class NoRead extends PackageJson {
  read(): NormalizedManifest {
    throw new Error('read package.json')
  }
}

const check = (n: Node, packageJson: PackageJson = new NoRead()) =>
  checkNeededBuild({
    diff: { nodes: { add: new Set([n]) } } as unknown as Diff,
    scurry: new PathScurry(dir),
    packageJson,
  }).needsBuildNodes.includes(n)

const manifest = { name: 'x', version: '1.0.0' }

t.test('store data: no package.json read', async t => {
  t.equal(check(node('plain', { manifest, bindingGyp: true })), true)
  t.equal(
    check(node('gyp', { manifest, bindingGyp: false })),
    false,
    'index wins over the disk',
  )
})

t.test('unknown binding.gyp: checked on disk', async t => {
  t.equal(check(node('gyp', { manifest })), true)
  t.equal(check(node('plain', { manifest })), false)
})

t.test('no manifest: read from disk', async t => {
  const n = node('gyp', { bindingGyp: false })
  t.equal(check(n, new PackageJson()), false)
  t.match(n.manifest, { name: 'gyp' })
  t.equal(check(node('plain'), new NoRead()), false, 'unreadable')
})

t.test('built, or install script', async t => {
  t.equal(
    check(node('gyp', { manifest, bindingGyp: true, built: true })),
    false,
  )
  t.equal(
    check(
      node('plain', {
        manifest: { ...manifest, scripts: { postinstall: 'x' } },
      }),
    ),
    true,
  )
})
