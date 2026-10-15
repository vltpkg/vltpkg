import { joinDepIDTuple } from '@vltpkg/dep-id'
import { PackageJson } from '@vltpkg/package-json'
import {
  appendFileSync,
  existsSync,
  linkSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readlinkSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { dirname, resolve } from 'node:path'
import { PathScurry } from 'path-scurry'
import t from 'tap'
import type { Test } from 'tap'
import { load as actualLoad } from '../../src/actual/load.ts'
import { Graph } from '../../src/graph.ts'
import {
  linkSkills,
  listSkills,
  syncSkills,
  unlinkSkills,
} from '../../src/skills/index.ts'
import { mountSkill } from '../../src/skills/mounts.ts'

type Dir = NonNullable<Parameters<typeof t.testdir>[0]>

const fooId = joinDepIDTuple(['registry', '', 'foo@1.0.0'])
const barId = joinDepIDTuple(['registry', '', '@s/bar@1.0.0'])
const fooDir = `node_modules/.vlt/${fooId}/node_modules/foo`
const barDir = `node_modules/.vlt/${barId}/node_modules/@s/bar`
const skillMd = (d: string) => `---\ndescription: ${d}\n---\n`

const project = (
  t: Test,
  skills: Record<string, Dir> = {},
  store: Record<string, Dir> = {},
) =>
  t.testdir({
    'package.json': JSON.stringify({
      name: 'proj',
      version: '1.0.0',
      dependencies: { foo: '1.0.0', '@s/bar': '1.0.0' },
    }),
    'vlt.json': '{}',
    // the user's own skill, never touched
    skills: {
      mine: { 'SKILL.md': skillMd('mine') },
      ...skills,
    },
    node_modules: {
      foo: t.fixture('symlink', `./.vlt/${fooId}/node_modules/foo`),
      '@s': {
        bar: t.fixture(
          'symlink',
          `../.vlt/${barId}/node_modules/@s/bar`,
        ),
      },
      '.vlt': {
        ...store,
        [fooId]: {
          node_modules: {
            foo: {
              'package.json': JSON.stringify({
                name: 'foo',
                version: '1.0.0',
              }),
              skills: {
                a: { 'SKILL.md': skillMd('foo a') },
                b: { 'SKILL.md': skillMd('foo b') },
              },
            },
          },
        },
        [barId]: {
          node_modules: {
            '@s': {
              bar: {
                'package.json': JSON.stringify({
                  name: '@s/bar',
                  version: '1.0.0',
                }),
                'SKILL.md': skillMd('bar root'),
              },
            },
          },
        },
      },
    },
  })

const opts = (projectRoot: string) => ({
  projectRoot,
  packageJson: new PackageJson(),
  scurry: new PathScurry(projectRoot),
})

const load = (projectRoot: string) =>
  actualLoad({ ...opts(projectRoot), loadManifests: true })

// foo's files hardlinked from a fake global store (re-placed if
// already shared once, like a reinstall)
const shareFoo = (dir: string) =>
  ['package.json', 'skills/a/SKILL.md'].map(f => {
    const file = resolve(dir, fooDir, f)
    const twin = resolve(dir, 'global', f)
    if (existsSync(twin)) {
      rmSync(file)
      linkSync(twin, file)
    } else {
      mkdirSync(dirname(twin), { recursive: true })
      linkSync(file, twin)
    }
    return twin
  })
const nlink = (dir: string) =>
  statSync(resolve(dir, fooDir, 'skills/a/SKILL.md')).nlink

const target = (projectRoot: string, mount: string) => {
  const link = resolve(projectRoot, mount)
  return resolve(dirname(link), readlinkSync(link))
}

t.test('listSkills', async t => {
  const dir = project(t)
  const all = await listSkills(opts(dir))
  t.strictSame(
    all.map(s => [
      s.mount,
      s.name,
      s.version,
      s.description,
      s.linked,
    ]),
    [
      ['skills/@s/bar/bar', '@s/bar', '1.0.0', 'bar root', false],
      ['skills/foo/a', 'foo', '1.0.0', 'foo a', false],
      ['skills/foo/b', 'foo', '1.0.0', 'foo b', false],
    ],
  )
  t.strictSame(
    (await listSkills({ ...opts(dir), target: '#foo' })).map(
      s => s.mount,
    ),
    ['skills/foo/a', 'skills/foo/b'],
  )

  const empty = t.testdir({
    'package.json': JSON.stringify({ name: 'e', version: '1.0.0' }),
    'vlt.json': '{}',
  })
  t.strictSame(await listSkills(opts(empty)), [], 'nothing installed')

  const graph = new Graph({
    projectRoot: dir,
    mainManifest: { name: 'proj', version: '1.0.0' },
  })
  t.strictSame(
    await listSkills({ ...opts(dir), graph }),
    [],
    'uses the provided graph',
  )
})

t.test('linkSkills', async t => {
  const dir = project(t, {
    // dangling vlt link: package removed from the store
    gone: {
      x: t.fixture(
        'symlink',
        '../../node_modules/.vlt/~npm~gone@1.0.0/node_modules/gone/skills/x',
      ),
    },
  })
  const first = await linkSkills({ ...opts(dir), target: '*' })
  t.strictSame(
    first.linked.map(s => [s.mount, s.linked]),
    [
      ['skills/@s/bar/bar', true],
      ['skills/foo/a', true],
      ['skills/foo/b', true],
    ],
  )
  t.strictSame(first.unchanged, [])
  t.strictSame(first.removed, ['skills/gone/x'])
  t.strictSame(first.conflicts, [])
  t.equal(
    target(dir, 'skills/foo/a'),
    resolve(dir, fooDir, 'skills/a'),
  )
  t.equal(target(dir, 'skills/@s/bar/bar'), resolve(dir, barDir))
  t.notOk(existsSync(resolve(dir, 'skills/gone')), 'empty dir pruned')
  t.ok(
    lstatSync(resolve(dir, 'skills/mine/SKILL.md')).isFile(),
    'user skill untouched',
  )

  const second = await linkSkills({ ...opts(dir), target: '*' })
  t.strictSame(second.linked, [])
  t.strictSame(
    second.unchanged.map(s => [s.mount, s.linked]),
    [
      ['skills/@s/bar/bar', true],
      ['skills/foo/a', true],
      ['skills/foo/b', true],
    ],
  )
  t.strictSame(second.removed, [])

  t.strictSame(
    await linkSkills({ ...opts(dir), target: ':not(*)' }),
    { linked: [], unchanged: [], removed: [], conflicts: [] },
    'selects nothing',
  )

  t.test('prunes skills a linked package no longer has', async t => {
    const oldId = joinDepIDTuple(['registry', '', 'foo@0.9.0'])
    const old = `node_modules/.vlt/${oldId}/node_modules/foo/skills/old`
    const dir = project(
      t,
      { foo: { old: t.fixture('symlink', `../../${old}`) } },
      {
        [oldId]: {
          node_modules: {
            foo: { skills: { old: { 'SKILL.md': skillMd('old') } } },
          },
        },
      },
    )
    const other = await linkSkills({
      ...opts(dir),
      target: ':not(#foo)',
    })
    t.strictSame(other.removed, [], 'foo not linked: kept')
    t.equal(target(dir, 'skills/foo/old'), resolve(dir, old))
    const res = await linkSkills({ ...opts(dir), target: '#foo' })
    t.strictSame(res.removed, ['skills/foo/old'])
    t.strictSame(
      res.linked.map(s => s.mount),
      ['skills/foo/a', 'skills/foo/b'],
    )
    t.ok(existsSync(resolve(dir, old)), 'target kept')
  })

  t.test('reports conflicts', async t => {
    const dir = project(t, { foo: { a: { 'README.md': 'mine' } } })
    const res = await linkSkills({ ...opts(dir), target: '#foo' })
    t.strictSame(res.conflicts, ['skills/foo/a'])
    t.strictSame(
      res.linked.map(s => s.mount),
      ['skills/foo/b'],
    )
    t.ok(lstatSync(resolve(dir, 'skills/foo/a/README.md')).isFile())
  })
})

t.test(
  'linkSkills: private copies of store-hardlinked files',
  async t => {
    const dir = project(t)
    const [, twin] = shareFoo(dir)
    t.equal(nlink(dir), 2, 'shared')
    const res = await linkSkills({ ...opts(dir), target: '#foo' })
    t.strictSame(
      res.linked.map(s => s.mount),
      ['skills/foo/a', 'skills/foo/b'],
    )
    t.equal(nlink(dir), 1, 'linked: private')
    appendFileSync(resolve(dir, 'skills/foo/a/SKILL.md'), 'edit')
    t.equal(
      readFileSync(twin!, 'utf8'),
      skillMd('foo a'),
      'edit stays',
    )

    shareFoo(dir)
    const again = await linkSkills({ ...opts(dir), target: '#foo' })
    t.equal(again.unchanged.length, 2)
    t.equal(nlink(dir), 1, 'unchanged: private')

    shareFoo(dir)
    await linkSkills({ ...opts(dir), target: ':not(#foo)' })
    t.equal(nlink(dir), 1, 'live link, not selected: private')

    // same name, not in the store: never unshared
    const graph = load(dir)
    graph.addNode(joinDepIDTuple(['file', 'local']), {
      name: 'foo',
      version: '2.0.0',
    }).location = './local'
    mkdirSync(resolve(dir, 'local'))
    const pj = resolve(dir, 'local/package.json')
    writeFileSync(pj, '{}')
    linkSync(pj, resolve(dir, 'local-twin.json'))
    await linkSkills({ ...opts(dir), graph, target: '#foo' })
    t.equal(statSync(pj).nlink, 2, 'non-store node: shared')
  },
)

t.test('syncSkills', async t => {
  t.test('links with allowSkills', async t => {
    const dir = project(t)
    const res = await syncSkills({
      ...opts(dir),
      graph: load(dir),
      allowSkills: '#foo',
    })
    t.strictSame(
      res?.linked.map(s => s.mount),
      ['skills/foo/a', 'skills/foo/b'],
    )
  })

  t.test('else prunes dangling links', async t => {
    const dir = project(t, {
      // a user link, not into a store
      other: { y: t.fixture('symlink', '../mine') },
    })
    await linkSkills({ ...opts(dir), target: '#foo' })
    mountSkill(
      {
        name: 'gone',
        id: joinDepIDTuple(['registry', '', 'gone@1.0.0']),
        skill: 'x',
        path: resolve(dir, 'node_modules/.vlt/~npm~gone@1.0.0/x'),
        mount: 'skills/gone/x',
        linked: false,
      },
      dir,
    )
    // re-placed under a live link (eg, vlt ci)
    shareFoo(dir)
    const sync = (allowSkills?: string) =>
      syncSkills({ ...opts(dir), graph: load(dir), allowSkills })
    t.strictSame(await sync(), {
      linked: [],
      unchanged: [],
      removed: ['skills/gone/x'],
      conflicts: [],
    })
    t.equal(await sync(':not(*)'), undefined, 'nothing left to prune')
    t.notOk(existsSync(resolve(dir, 'skills/gone')), 'dangling: gone')
    t.ok(lstatSync(resolve(dir, 'skills/foo/a')).isSymbolicLink())
    t.ok(lstatSync(resolve(dir, 'skills/other/y')).isSymbolicLink())
    t.ok(lstatSync(resolve(dir, 'skills/mine/SKILL.md')).isFile())
    t.equal(nlink(dir), 1, 'live link: private')
  })

  t.test('no ./skills: nothing created', async t => {
    const dir = t.testdir({
      'package.json': JSON.stringify({ name: 'e', version: '1.0.0' }),
      'vlt.json': '{}',
    })
    t.equal(
      await syncSkills({ ...opts(dir), graph: load(dir) }),
      undefined,
    )
    t.notOk(existsSync(resolve(dir, 'skills')))
  })

  t.test('best effort', async t => {
    const { syncSkills } = await t.mockImport<
      typeof import('../../src/skills/index.ts')
    >('../../src/skills/index.ts', {
      '../../src/reify/unshare.ts': {
        unshare: async () => {
          throw new Error('nope')
        },
      },
    })
    const dir = project(t)
    await linkSkills({ ...opts(dir), target: '#foo' })
    t.equal(
      await syncSkills({ ...opts(dir), graph: load(dir) }),
      undefined,
    )
  })
})

t.test('unlinkSkills', async t => {
  const setup = async (t: Test) => {
    const dir = project(t)
    await linkSkills({ ...opts(dir), target: '*' })
    // a dangling vlt link, removed even when not selected
    mountSkill(
      {
        name: 'gone',
        id: joinDepIDTuple(['registry', '', 'gone@1.0.0']),
        skill: 'x',
        path: resolve(dir, 'node_modules/.vlt/~npm~gone@1.0.0/x'),
        mount: 'skills/gone/x',
        linked: false,
      },
      dir,
    )
    return dir
  }

  t.test('by target', async t => {
    const dir = await setup(t)
    t.strictSame(
      await unlinkSkills({ ...opts(dir), target: '#foo' }),
      {
        removed: ['skills/foo/a', 'skills/foo/b', 'skills/gone/x'],
      },
    )
    t.ok(
      lstatSync(resolve(dir, 'skills/@s/bar/bar')).isSymbolicLink(),
    )
    t.ok(lstatSync(resolve(dir, 'skills/mine/SKILL.md')).isFile())
  })

  t.test('all by default', async t => {
    const dir = await setup(t)
    t.strictSame(await unlinkSkills(opts(dir)), {
      removed: [
        'skills/@s/bar/bar',
        'skills/foo/a',
        'skills/foo/b',
        'skills/gone/x',
      ],
    })
    t.strictSame(await unlinkSkills({ ...opts(dir), target: '*' }), {
      removed: [],
    })
    t.ok(lstatSync(resolve(dir, 'skills/mine/SKILL.md')).isFile())
    t.notOk(existsSync(resolve(dir, 'skills/foo')))
  })
})
