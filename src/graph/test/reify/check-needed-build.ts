import { PackageJson } from '@vltpkg/package-json'
import type { NormalizedManifest } from '@vltpkg/types'
import { resolve } from 'node:path'
import { PathScurry } from 'path-scurry'
import t from 'tap'
import type { Diff } from '../../src/diff.ts'
import type { GraphModifier } from '../../src/modifiers.ts'
import type { Node } from '../../src/node.ts'
import {
  carryBuildState,
  checkNeededBuild,
} from '../../src/reify/check-needed-build.ts'

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
    edgesOut?: Map<string, { to?: object }>
    edgesIn?: Set<{ name: string }>
    inVltStore?: () => boolean
    isLinkTarget?: () => boolean
  } = {},
) =>
  ({
    id: `··${name}@1.0.0`,
    name,
    built: false,
    importer: false,
    edgesOut: new Map(),
    edgesIn: new Set(),
    inVltStore: () => true,
    isLinkTarget: () => false,
    toString: () => `${name}@1.0.0`,
    resolvedLocation: () => resolve(dir, name),
    ...props,
  }) as unknown as Node

// fails any disk read, to prove the node's own data was used
class NoRead extends PackageJson {
  read(): NormalizedManifest {
    throw new Error('read package.json')
  }
}

const check = (
  n: Node,
  packageJson: PackageJson = new NoRead(),
  modifiers?: GraphModifier,
) =>
  checkNeededBuild({
    diff: { nodes: { add: new Set([n]) } } as unknown as Diff,
    scurry: new PathScurry(dir),
    packageJson,
    modifiers,
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

t.test('built, link: target, or install script', async t => {
  t.equal(
    check(node('gyp', { manifest, bindingGyp: true, built: true })),
    false,
  )
  const scripts = { postinstall: 'x' }
  t.equal(
    check(node('plain', { manifest: { ...manifest, scripts } })),
    true,
  )
  t.equal(
    check(
      node('plain', {
        manifest: { ...manifest, scripts },
        isLinkTarget: () => true,
      }),
    ),
    false,
  )
})

t.test('dependency missing from the lockfile', async t => {
  const dep = (
    extra: Record<string, unknown> = {},
    props: Parameters<typeof node>[1] = {},
  ) =>
    node('plain', {
      manifest: {
        ...manifest,
        dependencies: { b: '1' },
        ...extra,
      },
      bindingGyp: false,
      ...props,
    })
  const message =
    'plain@1.0.0 depends on b, which is missing from vlt-lock.json.'
  const removes = (name: string) =>
    ({
      removesEdge: (n: string) => n === name,
    }) as unknown as GraphModifier
  t.equal(
    check(dep({}, { edgesOut: new Map([['b', { to: {} }]]) })),
    false,
    'locked',
  )
  t.throws(
    () =>
      check(
        dep(
          {},
          {
            edgesOut: new Map([['b', {}]]),
            edgesIn: new Set([
              { name: 'a' },
              { name: 'a' },
              { name: 'alias' },
            ]),
          },
        ),
      ),
    {
      message: `${message} Run \`vlt update a alias\` to repair it.`,
      cause: { found: '··plain@1.0.0' },
    },
    'edge with no target, dependents by edge name',
  )
  t.throws(() => check(dep()), {
    message: `${message} Run \`vlt update plain\` to repair it.`,
  })
  t.throws(() => check(dep({ bundleDependencies: ['c'] })), {
    message,
  })
  t.throws(() => check(dep(), undefined, removes('c')), { message })
  for (const extra of [
    { bundleDependencies: ['b'] },
    { bundledDependencies: ['b'] },
    { bundleDependencies: true },
    { optionalDependencies: { b: '1' } },
  ]) {
    t.equal(check(dep(extra)), false, JSON.stringify(extra))
  }
  t.equal(check(dep(), undefined, removes('b')), false, 'modifier')
  t.equal(
    check(dep({}, { inVltStore: () => false })),
    false,
    'not in the store',
  )
})

t.test('carryBuildState', async t => {
  const n = (id: string, buildState: Node['buildState'] = 'none') =>
    ({ id, buildState }) as Node
  const from = [n('a', 'needed'), n('b', 'built'), n('c', 'built')]
  const to = [n('a'), n('b'), n('c', 'needed'), n('d')]
  const nodes = (list: Node[]) => new Map(list.map(x => [x.id, x]))
  carryBuildState({
    from: { nodes: nodes(from) },
    to: { nodes: nodes(to) },
    nodes: { add: new Set([to[2]]) },
  } as unknown as Diff)
  t.strictSame(
    to.map(x => x.buildState),
    ['needed', 'built', 'needed', 'none'],
    'kept nodes carried, added and new ones untouched',
  )
})
