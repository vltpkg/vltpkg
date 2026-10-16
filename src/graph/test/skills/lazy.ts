import { joinDepIDTuple } from '@vltpkg/dep-id'
import t from 'tap'
import type { NodeLike } from '@vltpkg/types'
import { Graph } from '../../src/graph.ts'
import type { Node } from '../../src/node.ts'
import type {
  LinkSkillsOptions,
  SkillsOptions,
} from '../../src/skills/index.ts'

t.test('loads the skills code on first use', async t => {
  const reads = { listSkills: 0, linkSkills: 0 }
  const calls: unknown[] = []
  const list = { skills: [], dirs: [] }
  const link = { linked: [] }
  const { listSkills, linkSkills } = await t.mockImport<
    typeof import('../../src/skills/lazy.ts')
  >('../../src/skills/lazy.ts', {
    '../../src/skills/index.ts': {
      get listSkills() {
        reads.listSkills++
        return async (o: unknown) => (calls.push(['list', o]), list)
      },
      get linkSkills() {
        reads.linkSkills++
        return async (o: unknown) => (calls.push(['link', o]), link)
      },
    },
  })
  t.strictSame(reads, { listSkills: 0, linkSkills: 0 }, 'not loaded')
  const lo = { target: '#a' } as SkillsOptions
  const ko = { target: '#b' } as LinkSkillsOptions
  t.equal(await listSkills(lo), list)
  t.equal(await linkSkills(ko), link)
  t.equal(await listSkills(lo), list)
  t.equal(await linkSkills(ko), link)
  t.strictSame(calls, [
    ['list', lo],
    ['link', ko],
    ['list', lo],
    ['link', ko],
  ])
  t.strictSame(reads, { listSkills: 1, linkSkills: 1 }, 'loaded once')
})

t.test('hasSkills: loads the skills code on first Node', async t => {
  let reads = 0
  const asked: unknown[] = []
  const { hasSkills } = await t.mockImport<
    typeof import('../../src/skills/lazy.ts')
  >('../../src/skills/lazy.ts', {
    '../../src/skills/index.ts': {
      get shipsSkills() {
        reads++
        return (node: Node) => (asked.push(node), node.name === 'a')
      },
    },
  })
  const graph = new Graph({
    mainManifest: { name: 'root', version: '1.0.0' },
    projectRoot: t.testdirName,
  })
  const node = (n: string) =>
    graph.addNode(joinDepIDTuple(['registry', '', `${n}@1.0.0`]), {
      name: n,
      version: '1.0.0',
    })
  const a = node('a')
  const b = node('b')
  const plain = { id: a.id, name: 'a', manifest: a.manifest }
  t.equal(
    await hasSkills(plain as unknown as NodeLike),
    false,
    'not a Node',
  )
  t.equal(reads, 0, 'not loaded')
  t.equal(await hasSkills(a), true)
  t.equal(await hasSkills(b), false)
  t.strictSame(asked, [a, b])
  t.equal(reads, 1, 'loaded once')
})
