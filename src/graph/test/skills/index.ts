import { joinDepIDTuple } from '@vltpkg/dep-id'
import { PackageJson } from '@vltpkg/package-json'
import { Spec } from '@vltpkg/spec'
import {
  appendFileSync,
  existsSync,
  linkSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
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
import type { Node } from '../../src/node.ts'
import {
  linkSkills,
  listSkills,
  syncSkills,
  unlinkSkills,
} from '../../src/skills/index.ts'
import { mountSkill } from '../../src/skills/mounts.ts'

type Dir = NonNullable<Parameters<typeof t.testdir>[0]>

const reg = (spec: string) => joinDepIDTuple(['registry', '', spec])
const fooId = reg('foo@1.0.0')
const barId = reg('@s/bar@1.0.0')
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

// a store package dir w/ skills
const pkg = (
  id: string,
  name: string,
  skills: string[],
): Record<string, Dir> => ({
  [id]: {
    node_modules: {
      [name]: {
        skills: Object.fromEntries(
          skills.map(s => [
            s,
            { 'SKILL.md': skillMd(`${name} ${s}`) },
          ]),
        ),
      },
    },
  },
})

// add a skill to a store package dir
const addSkill = (dir: string, pkgDir: string, s: string) => {
  mkdirSync(resolve(dir, pkgDir, 'skills', s), { recursive: true })
  writeFileSync(resolve(dir, pkgDir, 'skills', s, 'SKILL.md'), '')
}

const opts = (projectRoot: string) => ({
  projectRoot,
  packageJson: new PackageJson(),
  scurry: new PathScurry(projectRoot),
})

const load = (projectRoot: string) =>
  actualLoad({ ...opts(projectRoot), loadManifests: true })

// a graph w/ the given deps: [from (undefined = root), spec, version]
const graphOf = (
  projectRoot: string,
  deps: [string | undefined, string, string, string?][],
) => {
  const graph = new Graph({
    projectRoot,
    mainManifest: { name: 'proj', version: '1.0.0' },
  })
  const placed = new Map<string, Node>()
  for (const [from, spec, version, name] of deps) {
    const s = Spec.parse(spec)
    const node = graph.placePackage(
      from ? placed.get(from)! : graph.mainImporter,
      'prod',
      s,
      { name: name ?? s.name, version },
    )
    if (!node) throw new Error('failed to place ' + spec)
    placed.set(spec, node)
  }
  return graph
}

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

const isLink = (dir: string, mount: string) =>
  !!lstatSync(resolve(dir, mount), {
    throwIfNoEntry: false,
  })?.isSymbolicLink()

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
      ['skills/a', 'foo', '1.0.0', 'foo a', false],
      ['skills/b', 'foo', '1.0.0', 'foo b', false],
      ['skills/bar', '@s/bar', '1.0.0', 'bar root', false],
    ],
  )
  t.strictSame(
    (await listSkills({ ...opts(dir), target: '#foo' })).map(
      s => s.mount,
    ),
    ['skills/a', 'skills/b'],
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
    gone: t.fixture(
      'symlink',
      '../node_modules/.vlt/~npm~gone@1.0.0/node_modules/gone/skills/gone',
    ),
  })
  const first = await linkSkills({ ...opts(dir), target: '*' })
  t.strictSame(
    first.linked.map(s => [s.mount, s.linked]),
    [
      ['skills/a', true],
      ['skills/b', true],
      ['skills/bar', true],
    ],
  )
  t.strictSame(first.unchanged, [])
  t.strictSame(first.removed, ['skills/gone'])
  t.strictSame(first.conflicts, [])
  t.equal(target(dir, 'skills/a'), resolve(dir, fooDir, 'skills/a'))
  t.equal(target(dir, 'skills/bar'), resolve(dir, barDir))
  t.notOk(isLink(dir, 'skills/gone'), 'dangling link pruned')
  t.ok(
    lstatSync(resolve(dir, 'skills/mine/SKILL.md')).isFile(),
    'user skill untouched',
  )

  const second = await linkSkills({ ...opts(dir), target: '*' })
  t.strictSame(second.linked, [])
  t.strictSame(
    second.unchanged.map(s => [s.mount, s.linked]),
    [
      ['skills/a', true],
      ['skills/b', true],
      ['skills/bar', true],
    ],
  )
  t.strictSame(second.removed, [])

  t.strictSame(
    await linkSkills({ ...opts(dir), target: ':not(*)' }),
    { linked: [], unchanged: [], removed: [], conflicts: [] },
    'selects nothing',
  )

  t.test('prunes links to an orphan store dir', async t => {
    const oldId = reg('foo@0.9.0')
    const old = `node_modules/.vlt/${oldId}/node_modules/foo/skills/old`
    const dir = project(
      t,
      { old: t.fixture('symlink', `../${old}`) },
      pkg(oldId, 'foo', ['old']),
    )
    const res = await linkSkills({
      ...opts(dir),
      target: ':not(#foo)',
    })
    t.strictSame(res.removed, ['skills/old'], 'not in the graph')
    t.ok(existsSync(resolve(dir, old)), 'target kept')
  })

  t.test('reports conflicts', async t => {
    const dir = project(t, { a: { 'README.md': 'mine' } })
    const res = await linkSkills({ ...opts(dir), target: '#foo' })
    t.strictSame(res.conflicts, ['skills/a'])
    t.strictSame(
      res.linked.map(s => s.mount),
      ['skills/b'],
    )
    t.ok(lstatSync(resolve(dir, 'skills/a/README.md')).isFile())

    // winner's path in use: losers still reported
    addSkill(dir, barDir, 'a')
    const all = await linkSkills({ ...opts(dir), target: '*' })
    t.strictSame(all.conflicts, ['skills/a', 'skills/a (foo@1.0.0)'])
  })
})

t.test('linkSkills: same name from different packages', async t => {
  t.test('rank wins, not version', async t => {
    const dir = project(t, {}, pkg(reg('baz@9.0.0'), 'baz', ['a']))
    const graph = graphOf(dir, [
      [undefined, 'foo@1', '1.0.0'],
      ['foo@1', 'baz@9', '9.0.0'],
    ])
    const res = await linkSkills({ ...opts(dir), graph, target: '*' })
    t.strictSame(
      res.linked.map(s => s.mount),
      ['skills/a', 'skills/b'],
    )
    t.strictSame(res.conflicts, ['skills/a (baz@9.0.0)'])
    t.equal(target(dir, 'skills/a'), resolve(dir, fooDir, 'skills/a'))
  })

  t.test('same rank: DepID wins', async t => {
    const dir = project(t)
    addSkill(dir, barDir, 'a')
    const res = await linkSkills({ ...opts(dir), target: '*' })
    t.strictSame(res.conflicts, ['skills/a (foo@1.0.0)'])
    t.equal(target(dir, 'skills/a'), resolve(dir, barDir, 'skills/a'))
  })

  t.test('case-insensitive names', async t => {
    const dir = project(t)
    addSkill(dir, barDir, 'A')
    const res = await linkSkills({ ...opts(dir), target: '*' })
    t.strictSame(
      res.linked.map(s => s.mount),
      ['skills/A', 'skills/b', 'skills/bar'],
    )
    t.strictSame(res.conflicts, ['skills/a (foo@1.0.0)'])
  })

  t.test('an existing live link keeps the name', async t => {
    const dir = project(t, {
      a: t.fixture('symlink', `../${fooDir}/skills/a`),
    })
    addSkill(dir, barDir, 'a')
    const all = await linkSkills({ ...opts(dir), target: '*' })
    t.strictSame(
      all.unchanged.map(s => s.mount),
      ['skills/a'],
    )
    t.strictSame(all.conflicts, ['skills/a (@s/bar@1.0.0)'])
    const notFoo = await linkSkills({
      ...opts(dir),
      target: ':not(#foo)',
    })
    t.strictSame(notFoo.conflicts, ['skills/a (@s/bar@1.0.0)'])
    t.strictSame(notFoo.removed, [], 'foo not scanned: kept')
    t.equal(target(dir, 'skills/a'), resolve(dir, fooDir, 'skills/a'))

    t.strictSame(
      await unlinkSkills({ ...opts(dir), target: '#foo' }),
      { removed: ['skills/a', 'skills/b'] },
    )
    const freed = await linkSkills({
      ...opts(dir),
      target: ':not(#foo)',
    })
    t.strictSame(freed.conflicts, [])
    t.equal(target(dir, 'skills/a'), resolve(dir, barDir, 'skills/a'))
  })

  t.test('a stale link of another package is replaced', async t => {
    const dir = project(t, {
      a: t.fixture('symlink', '../outside/node_modules/.vlt/x/a'),
    })
    mkdirSync(resolve(dir, 'outside/node_modules/.vlt/x/a'), {
      recursive: true,
    })
    const res = await linkSkills({ ...opts(dir), target: '#foo' })
    t.strictSame(
      res.linked.map(s => s.mount),
      ['skills/a', 'skills/b'],
    )
    t.strictSame(res.removed, [])
    t.strictSame(res.conflicts, [])
    t.equal(target(dir, 'skills/a'), resolve(dir, fooDir, 'skills/a'))
  })
})

t.test('linkSkills: version updates and stale links', async t => {
  t.test('dangling link follows its package', async t => {
    const oldId = reg('foo@0.9.0')
    const old = `node_modules/.vlt/${oldId}/node_modules/foo/skills`
    const dir = project(t, {
      a: t.fixture('symlink', `../${old}/a`),
      old: t.fixture('symlink', `../${old}/old`),
    })
    addSkill(dir, barDir, 'a')
    const res = await linkSkills({ ...opts(dir), target: '*' })
    t.strictSame(
      res.linked.map(s => s.mount),
      ['skills/a', 'skills/b', 'skills/bar'],
    )
    t.strictSame(res.conflicts, ['skills/a (@s/bar@1.0.0)'])
    t.strictSame(res.removed, ['skills/old'], 'foo@1 lacks it')
    t.equal(target(dir, 'skills/a'), resolve(dir, fooDir, 'skills/a'))
  })

  t.test('live link to an older version is re-pointed', async t => {
    const oldId = reg('foo@0.5.0')
    const old = `node_modules/.vlt/${oldId}/node_modules/foo/skills`
    const dir = project(
      t,
      {
        a: t.fixture('symlink', `../${old}/a`),
        // foo@1 lacks it, still installed: kept
        old: t.fixture('symlink', `../${old}/old`),
      },
      pkg(oldId, 'foo', ['a', 'old']),
    )
    const graph = graphOf(dir, [
      [undefined, 'foo@1', '1.0.0'],
      [undefined, '@s/bar@1', '1.0.0'],
      ['@s/bar@1', 'foo@0.5', '0.5.0'],
    ])
    const res = await linkSkills({ ...opts(dir), graph, target: '*' })
    t.strictSame(
      res.linked.map(s => s.mount),
      ['skills/a', 'skills/b', 'skills/bar'],
    )
    t.strictSame(res.removed, [])
    t.equal(target(dir, 'skills/a'), resolve(dir, fooDir, 'skills/a'))
    t.equal(target(dir, 'skills/old'), resolve(dir, old, 'old'))
  })

  t.test('case-renamed skill: one link', async t => {
    const oldId = reg('foo@0.5.0')
    const old = `node_modules/.vlt/${oldId}/node_modules/foo/skills/A`
    const dir = project(
      t,
      { A: t.fixture('symlink', `../${old}`) },
      pkg(oldId, 'foo', ['A']),
    )
    const graph = graphOf(dir, [
      [undefined, 'foo@1', '1.0.0'],
      ['foo@1', 'foo@0.5', '0.5.0'],
    ])
    const res = await linkSkills({
      ...opts(dir),
      graph,
      target: '#foo',
    })
    t.strictSame(
      res.linked.map(s => s.mount),
      ['skills/a', 'skills/b'],
    )
    t.strictSame(res.removed, [])
    t.strictSame(
      readdirSync(resolve(dir, 'skills')).filter(e => /^a$/i.test(e)),
      ['a'],
    )
    t.equal(target(dir, 'skills/a'), resolve(dir, fooDir, 'skills/a'))
  })

  t.test('scanned owner no longer ships it', async t => {
    const dir = project(t, {
      old: t.fixture('symlink', `../${fooDir}/skills/old`),
    })
    mkdirSync(resolve(dir, fooDir, 'skills/old'))
    writeFileSync(resolve(dir, fooDir, 'skills/old/README.md'), '')
    const notFoo = await linkSkills({
      ...opts(dir),
      target: ':not(#foo)',
    })
    t.strictSame(notFoo.removed, [], 'not scanned: kept')
    const res = await linkSkills({ ...opts(dir), target: '#foo' })
    t.strictSame(res.removed, ['skills/old'])
    t.ok(
      existsSync(resolve(dir, fooDir, 'skills/old')),
      'target kept',
    )
  })

  t.test('dangling link, owner in the graph', async t => {
    const dir = project(t, {
      gone: t.fixture('symlink', `../${fooDir}/skills/missing`),
    })
    const res = await linkSkills({ ...opts(dir), target: ':not(*)' })
    t.strictSame(res.removed, ['skills/gone'])
  })

  t.test('owner-less store link', async t => {
    const dir = project(t, {
      x: t.fixture('symlink', '../outside/node_modules/.vlt/x/a'),
    })
    mkdirSync(resolve(dir, 'outside/node_modules/.vlt/x/a'), {
      recursive: true,
    })
    t.strictSame(
      await unlinkSkills({ ...opts(dir), target: '#foo' }),
      { removed: [] },
      'not selected: kept',
    )
    const res = await linkSkills({ ...opts(dir), target: '*' })
    t.strictSame(res.removed, ['skills/x'])
  })

  t.test('renamed skill, same DepID', async t => {
    const dir = project(t, {
      renamed: t.fixture('symlink', `../${barDir}`),
    })
    const res = await linkSkills({ ...opts(dir), target: '*' })
    t.strictSame(res.removed, ['skills/renamed'])
    t.equal(target(dir, 'skills/bar'), resolve(dir, barDir))
  })
})

t.test('linkSkills: aliased package', async t => {
  const gitId = joinDepIDTuple([
    'git',
    'github:vercel-labs/skills',
    '',
  ])
  const gitDir = `node_modules/.vlt/${gitId}/node_modules/skills`
  const nvId = reg('nv@x')
  const dir = project(
    t,
    {},
    {
      ...pkg(gitId, 'skills', ['find-skills', 'a']),
      ...pkg(nvId, 'nv', ['a']),
    },
  )
  const graph = graphOf(dir, [
    [undefined, 'foo@1', '1.0.0'],
    [
      undefined,
      'vercelskills@github:vercel-labs/skills',
      '1.7.2',
      'skills',
    ],
  ])
  // no version
  graph.addNode(nvId, { name: 'nv' })
  const all = await linkSkills({ ...opts(dir), graph, target: '*' })
  t.strictSame(
    all.linked.map(s => [s.mount, s.alias]),
    [
      ['skills/a', undefined],
      ['skills/b', undefined],
      ['skills/find-skills', 'vercelskills'],
    ],
  )
  t.strictSame(all.conflicts, [
    'skills/a (vercelskills (skills@1.7.2))',
    'skills/a (nv)',
  ])
  t.strictSame(
    await unlinkSkills({
      ...opts(dir),
      graph,
      target: '#vercelskills',
    }),
    { removed: ['skills/find-skills'] },
  )
  t.ok(isLink(dir, 'skills/a'), 'other links kept')

  await linkSkills({ ...opts(dir), graph, target: '*' })
  const file = resolve(dir, gitDir, 'skills/find-skills/SKILL.md')
  const pj = resolve(dir, gitDir, 'package.json')
  writeFileSync(pj, '{}')
  linkSync(pj, resolve(dir, 'twin.json'))
  linkSync(file, resolve(dir, 'twin.md'))
  t.equal(statSync(file).nlink, 2, 'shared')
  await linkSkills({ ...opts(dir), graph, target: ':not(*)' })
  t.equal(statSync(file).nlink, 1, 'live link: private')
})

t.test(
  'linkSkills: private copies of store-hardlinked files',
  async t => {
    const dir = project(t)
    mkdirSync(resolve(dir, 'node_modules/.vlt/file~local/x'), {
      recursive: true,
    })
    const [, twin] = shareFoo(dir)
    t.equal(nlink(dir), 2, 'shared')
    const res = await linkSkills({ ...opts(dir), target: '#foo' })
    t.strictSame(
      res.linked.map(s => s.mount),
      ['skills/a', 'skills/b'],
    )
    t.equal(nlink(dir), 1, 'linked: private')
    appendFileSync(resolve(dir, 'skills/a/SKILL.md'), 'edit')
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

    // owner not in the store: never unshared
    const graph = load(dir)
    const localId = joinDepIDTuple(['file', 'local'])
    graph.addNode(localId, {
      name: 'local',
      version: '2.0.0',
    }).location = './local'
    mkdirSync(resolve(dir, 'local'))
    const pj = resolve(dir, 'local/package.json')
    writeFileSync(pj, '{}')
    linkSync(pj, resolve(dir, 'local-twin.json'))
    // a live link into the non-store node's dir
    mountSkill(
      {
        name: 'local',
        id: localId,
        skill: 'x',
        path: resolve(dir, 'node_modules/.vlt/file~local/x'),
        mount: 'skills/x',
        linked: false,
      },
      dir,
      'skills',
    )
    const kept = await linkSkills({
      ...opts(dir),
      graph,
      target: '#foo',
    })
    t.strictSame(kept.removed, [])
    t.ok(isLink(dir, 'skills/x'), 'live link kept')
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
      ['skills/a', 'skills/b'],
    )
  })

  t.test('else prunes dangling links', async t => {
    const dir = project(t, {
      // a user link, not into a store
      other: t.fixture('symlink', './mine'),
    })
    await linkSkills({ ...opts(dir), target: '#foo' })
    mountSkill(
      {
        name: 'gone',
        id: reg('gone@1.0.0'),
        skill: 'x',
        path: resolve(dir, 'node_modules/.vlt/~npm~gone@1.0.0/x'),
        mount: 'skills/x',
        linked: false,
      },
      dir,
      'skills',
    )
    // re-placed under a live link (eg, vlt ci)
    shareFoo(dir)
    const sync = (allowSkills?: string) =>
      syncSkills({ ...opts(dir), graph: load(dir), allowSkills })
    t.strictSame(await sync(), {
      linked: [],
      unchanged: [],
      removed: ['skills/x'],
      conflicts: [],
    })
    t.equal(await sync(':not(*)'), undefined, 'nothing left to prune')
    t.notOk(isLink(dir, 'skills/x'), 'dangling: gone')
    t.ok(isLink(dir, 'skills/a'))
    t.ok(isLink(dir, 'skills/other'))
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
        id: reg('gone@1.0.0'),
        skill: 'x',
        path: resolve(dir, 'node_modules/.vlt/~npm~gone@1.0.0/x'),
        mount: 'skills/x',
        linked: false,
      },
      dir,
      'skills',
    )
    return dir
  }

  t.test('by target', async t => {
    const dir = await setup(t)
    t.strictSame(
      await unlinkSkills({ ...opts(dir), target: '#foo' }),
      { removed: ['skills/a', 'skills/b', 'skills/x'] },
    )
    t.ok(isLink(dir, 'skills/bar'))
    t.ok(lstatSync(resolve(dir, 'skills/mine/SKILL.md')).isFile())
  })

  t.test('all by default', async t => {
    const dir = await setup(t)
    t.strictSame(await unlinkSkills(opts(dir)), {
      removed: ['skills/a', 'skills/b', 'skills/bar', 'skills/x'],
    })
    t.strictSame(await unlinkSkills({ ...opts(dir), target: '*' }), {
      removed: [],
    })
    t.ok(lstatSync(resolve(dir, 'skills/mine/SKILL.md')).isFile())
  })
})
