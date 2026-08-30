import { joinDepIDTuple } from '@vltpkg/dep-id'
import type { DepID } from '@vltpkg/dep-id'
import { RollbackRemove } from '@vltpkg/rollback-remove'
import type { SpecOptions } from '@vltpkg/spec'
import {
  existsSync,
  mkdirSync,
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

const writePkg = (root: string, id: DepID, body: string) => {
  const dir = join(root, 'node_modules/.vlt', id, 'node_modules/ui')
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'package.json'), body)
  return dir
}

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
