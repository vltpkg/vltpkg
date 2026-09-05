import { joinDepIDTuple } from '@vltpkg/dep-id'
import type { DepID } from '@vltpkg/dep-id'
import { RollbackRemove } from '@vltpkg/rollback-remove'
import type { SpecOptions } from '@vltpkg/spec'
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import { join } from 'node:path'
import { PathScurry } from 'path-scurry'
import t from 'tap'
import { Graph } from '../../src/graph.ts'
import { movePeerStoreDirs } from '../../src/ideal/move-peer-store-dirs.ts'
import type { Node } from '../../src/node.ts'

const configData = {
  registry: 'https://registry.npmjs.org/',
  registries: {
    npm: 'https://registry.npmjs.org/',
  },
} satisfies SpecOptions

const fromId = joinDepIDTuple(['registry', '', 'ui@1.0.0', 'peer.1'])
const toId = joinDepIDTuple([
  'registry',
  '',
  'ui@1.0.0',
  'peer.abcdabcdabcdabcd',
])

const thirdId = joinDepIDTuple([
  'registry',
  '',
  'ui@1.0.0',
  'peer.0123012301230123',
])

const store = (root: string) => join(root, 'node_modules/.vlt')

const writePkg = (root: string, id: DepID, body: string) => {
  const dir = join(store(root), id, 'node_modules/ui')
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'package.json'), body)
  return dir
}

const readPkg = (root: string, id: DepID) =>
  readFileSync(
    join(store(root), id, 'node_modules/ui/package.json'),
    'utf8',
  )

const parked = (root: string) =>
  readdirSync(store(root)).filter(n => n.startsWith('.VLT.MOVE.'))

const makeNode = (t: { testdirName: string }, id: DepID): Node => {
  const graph = new Graph({
    projectRoot: t.testdirName,
    ...configData,
    mainManifest: { name: 'my-project', version: '1.0.0' },
  })
  const node = graph.addNode(id, { name: 'ui', version: '1.0.0' })
  node.extracted = true
  return node
}

t.test('moves store dir and keeps contents', async t => {
  const root = t.testdir({})
  const node = makeNode(t, toId)
  writePkg(root, fromId, '{"name":"ui"}')
  const scurry = new PathScurry(root)
  await movePeerStoreDirs([{ node, from: fromId, to: toId }], {
    scurry,
    remover: new RollbackRemove(),
  })
  t.notOk(existsSync(join(root, 'node_modules/.vlt', fromId)))
  t.equal(
    readFileSync(
      join(
        root,
        'node_modules/.vlt',
        toId,
        'node_modules/ui/package.json',
      ),
      'utf8',
    ),
    '{"name":"ui"}',
  )
  t.equal(node.extracted, true)
})

t.test('discards a merged-away copy', async t => {
  const root = t.testdir({})
  const node = makeNode(t, fromId)
  writePkg(root, fromId, '{"name":"ui"}')
  const scurry = new PathScurry(root)
  await movePeerStoreDirs([{ node, from: fromId }], {
    scurry,
    remover: new RollbackRemove(),
  })
  t.notOk(existsSync(join(root, 'node_modules/.vlt', fromId)))
})

t.test(
  'pre-existing target is removed, moved content wins',
  async t => {
    const root = t.testdir({})
    const node = makeNode(t, toId)
    writePkg(root, fromId, '{"from":"src"}')
    writePkg(root, toId, '{"from":"dest"}')
    const scurry = new PathScurry(root)
    await movePeerStoreDirs([{ node, from: fromId, to: toId }], {
      scurry,
      remover: new RollbackRemove(),
    })
    t.equal(
      readFileSync(
        join(
          root,
          'node_modules/.vlt',
          toId,
          'node_modules/ui/package.json',
        ),
        'utf8',
      ),
      '{"from":"src"}',
    )
    t.equal(node.extracted, true)
  },
)

t.test('rename failure clears extracted', async t => {
  const root = t.testdir({})
  const node = makeNode(t, toId)
  const scurry = new PathScurry(root)
  await movePeerStoreDirs([{ node, from: fromId, to: toId }], {
    scurry,
    remover: new RollbackRemove(),
  })
  t.equal(node.extracted, false)
})

t.test(
  'moved dir without inner package dir clears extracted',
  async t => {
    const root = t.testdir({})
    const node = makeNode(t, toId)
    mkdirSync(join(root, 'node_modules/.vlt', fromId), {
      recursive: true,
    })
    const scurry = new PathScurry(root)
    await movePeerStoreDirs([{ node, from: fromId, to: toId }], {
      scurry,
      remover: new RollbackRemove(),
    })
    t.equal(node.extracted, false)
  },
)

t.test('empty plan is a no-op', async t => {
  const root = t.testdir({})
  const scurry = new PathScurry(root)
  await movePeerStoreDirs([], {
    scurry,
    remover: new RollbackRemove(),
  })
  t.notOk(existsSync(join(root, 'node_modules/.vlt')))
})

t.test(
  'chained moves land each source on its own destination',
  async t => {
    const root = t.testdir({})
    const a = makeNode(t, toId)
    const b = makeNode(t, thirdId)
    writePkg(root, fromId, '{"who":"a"}')
    writePkg(root, toId, '{"who":"b"}')
    const scurry = new PathScurry(root)
    await movePeerStoreDirs(
      [
        { node: a, from: fromId, to: toId },
        { node: b, from: toId, to: thirdId },
      ],
      { scurry, remover: new RollbackRemove() },
    )
    t.equal(readPkg(root, toId), '{"who":"a"}')
    t.equal(readPkg(root, thirdId), '{"who":"b"}')
    t.notOk(existsSync(join(store(root), fromId)))
    t.strictSame(parked(root), [])
    t.equal(a.extracted, true)
    t.equal(b.extracted, true)
  },
)

t.test('swapped moves exchange directories', async t => {
  const root = t.testdir({})
  const a = makeNode(t, toId)
  const b = makeNode(t, fromId)
  writePkg(root, fromId, '{"who":"a"}')
  writePkg(root, toId, '{"who":"b"}')
  const scurry = new PathScurry(root)
  await movePeerStoreDirs(
    [
      { node: a, from: fromId, to: toId },
      { node: b, from: toId, to: fromId },
    ],
    { scurry, remover: new RollbackRemove() },
  )
  t.equal(readPkg(root, toId), '{"who":"a"}')
  t.equal(readPkg(root, fromId), '{"who":"b"}')
  t.strictSame(parked(root), [])
  t.equal(a.extracted, true)
  t.equal(b.extracted, true)
})

t.test(
  'merged-away copy at a destination gives way to the mover',
  async t => {
    const root = t.testdir({})
    const keep = makeNode(t, toId)
    const loser = makeNode(t, toId)
    writePkg(root, fromId, '{"who":"keep"}')
    writePkg(root, toId, '{"who":"loser"}')
    const scurry = new PathScurry(root)
    await movePeerStoreDirs(
      [
        { node: keep, from: fromId, to: toId },
        { node: loser, from: toId },
      ],
      { scurry, remover: new RollbackRemove() },
    )
    t.equal(readPkg(root, toId), '{"who":"keep"}')
    t.notOk(existsSync(join(store(root), fromId)))
    t.strictSame(parked(root), [])
    t.equal(keep.extracted, true)
  },
)

t.test('settle failure clears extracted', async t => {
  const root = t.testdir({})
  const node = makeNode(t, toId)
  writePkg(root, fromId, '{"name":"ui"}')
  const scurry = new PathScurry(root)
  const remover = {
    rm: async () => {
      throw new Error('settle failed')
    },
  } as unknown as RollbackRemove
  await movePeerStoreDirs([{ node, from: fromId, to: toId }], {
    scurry,
    remover,
  })
  t.equal(node.extracted, false)
})
