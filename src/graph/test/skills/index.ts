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
  realpathSync,
  rmSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { dirname, resolve } from 'node:path'
import { PathScurry } from 'path-scurry'
import t from 'tap'
import type { Test } from 'tap'
import { load as actualLoad } from '../../src/actual/load.ts'
import { Graph } from '../../src/graph.ts'
import type { Node } from '../../src/node.ts'
import type { SkillsDir } from '../../src/skills/dirs.ts'
import {
  GITIGNORE_BEGIN,
  GITIGNORE_END,
} from '../../src/skills/gitignore.ts'
import {
  linkSkills,
  listSkills,
  syncSkills,
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
  root: Record<string, Dir> = {},
) =>
  t.testdir({
    ...root,
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
  skillsDirs: ['skills'],
})

// `<projectRoot>/<dir>` as a skills dir
const sd = (projectRoot: string, dir = 'skills'): SkillsDir => ({
  dir,
  real: resolve(realpathSync(projectRoot), dir),
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
  t.strictSame(all.dirs, ['skills'])
  t.strictSame(
    all.skills.map(s => [
      s.skill,
      s.name,
      s.version,
      s.description,
      s.linked,
    ]),
    [
      ['a', 'foo', '1.0.0', 'foo a', []],
      ['b', 'foo', '1.0.0', 'foo b', []],
      ['bar', '@s/bar', '1.0.0', 'bar root', []],
    ],
  )
  t.strictSame(
    (await listSkills({ ...opts(dir), target: '#foo' })).skills.map(
      s => s.skill,
    ),
    ['a', 'b'],
  )

  const empty = t.testdir({
    'package.json': JSON.stringify({ name: 'e', version: '1.0.0' }),
    'vlt.json': '{}',
  })
  t.strictSame(
    await listSkills(opts(empty)),
    { skills: [], dirs: ['skills'] },
    'nothing installed',
  )

  const graph = new Graph({
    projectRoot: dir,
    mainManifest: { name: 'proj', version: '1.0.0' },
  })
  t.strictSame(
    (await listSkills({ ...opts(dir), graph })).skills,
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
      ['skills/a', ['skills']],
      ['skills/b', ['skills']],
      ['skills/bar', ['skills']],
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
      ['skills/a', ['skills']],
      ['skills/b', ['skills']],
      ['skills/bar', ['skills']],
    ],
  )
  t.strictSame(second.removed, [])

  t.strictSame(
    await linkSkills({ ...opts(dir), target: ':not(*)' }),
    {
      linked: [],
      unchanged: [],
      removed: [],
      conflicts: [],
      dirs: ['skills'],
    },
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

    // apply: the selection takes the name in one run
    const freed = await linkSkills({
      ...opts(dir),
      target: ':not(#foo)',
      apply: true,
    })
    t.strictSame(
      freed.linked.map(s => s.mount),
      ['skills/a'],
    )
    t.strictSame(freed.removed, ['skills/b'])
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
    (
      await linkSkills({
        ...opts(dir),
        graph,
        target: ':not(#vercelskills)',
        apply: true,
      })
    ).removed,
    ['skills/find-skills'],
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
        skill: 'x',
        path: resolve(dir, 'node_modules/.vlt/file~local/x'),
      },
      sd(dir),
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

t.test('linkSkills: agent dirs', async t => {
  // detection, not ./skills
  const aopts = (projectRoot: string) => ({
    ...opts(projectRoot),
    skillsDirs: undefined,
    env: {},
  })
  const block = (...names: string[]) =>
    [
      GITIGNORE_BEGIN,
      ...names.map(n => `/${n}`),
      GITIGNORE_END,
      '',
    ].join('\n')
  const gitignore = (dir: string, d: string) =>
    readFileSync(resolve(dir, d, '.gitignore'), 'utf8')
  const both = ['.agents/skills', '.claude/skills']

  t.test('links into every target dir', async t => {
    const dir = project(t, {}, {}, { '.claude': {} })
    const res = await linkSkills({ ...aopts(dir), target: '#foo' })
    t.strictSame(res.dirs, both)
    t.strictSame(
      res.linked.map(s => [s.mount, s.dir, s.linked]),
      [
        ['.agents/skills/a', '.agents/skills', both],
        ['.agents/skills/b', '.agents/skills', both],
        ['.claude/skills/a', '.claude/skills', both],
        ['.claude/skills/b', '.claude/skills', both],
      ],
    )
    t.equal(
      target(dir, '.claude/skills/a'),
      resolve(dir, fooDir, 'skills/a'),
    )
    t.equal(gitignore(dir, '.agents/skills'), block('a', 'b'))
    t.equal(gitignore(dir, '.claude/skills'), block('a', 'b'))
    t.notOk(isLink(dir, 'skills/a'), './skills not used')
  })

  t.test('conflicts per dir', async t => {
    const dir = project(
      t,
      {},
      {},
      { '.claude': { skills: { a: { 'SKILL.md': 'mine' } } } },
    )
    const res = await linkSkills({ ...aopts(dir), target: '#foo' })
    t.strictSame(res.conflicts, ['.claude/skills/a'])
    t.strictSame(
      res.linked.map(s => [s.mount, s.linked]),
      [
        ['.agents/skills/a', ['.agents/skills']],
        ['.agents/skills/b', both],
        ['.claude/skills/b', both],
      ],
    )
    t.equal(gitignore(dir, '.claude/skills'), block('b'))
  })

  t.test(
    'dir changes: installs keep links, apply removes',
    async t => {
      const dir = project(t, {}, {}, { '.claude': {} })
      await linkSkills({ ...aopts(dir), target: '#foo' })
      const custom = await linkSkills({
        ...aopts(dir),
        skillsDirs: ['custom'],
        target: '#foo',
      })
      t.strictSame(
        custom.linked.map(s => s.mount),
        ['custom/a', 'custom/b'],
      )
      t.strictSame(custom.removed, [])
      t.strictSame(custom.dirs, ['custom'])
      const none = await linkSkills({
        ...aopts(dir),
        skillsDirs: [],
        target: '#foo',
      })
      t.strictSame(none.linked, [])
      t.strictSame(none.removed, [])
      t.strictSame(none.dirs, [])
      t.ok(isLink(dir, '.claude/skills/a'), 'kept')
      const applied = await linkSkills({
        ...aopts(dir),
        skillsDirs: [],
        target: '#foo',
        apply: true,
      })
      t.strictSame(applied.removed, [
        '.agents/skills/a',
        '.agents/skills/b',
        '.claude/skills/a',
        '.claude/skills/b',
      ])
      t.ok(isLink(dir, 'custom/a'), 'dropped custom dir: not scanned')
      t.equal(
        gitignore(dir, '.agents/skills'),
        block(),
        'block emptied',
      )
      t.equal(gitignore(dir, '.claude/skills'), block())
      t.strictSame(readdirSync(resolve(dir, '.claude/skills')), [
        '.gitignore',
      ])
    },
  )

  t.test('apply removes links of unselected packages', async t => {
    const dir = project(
      t,
      {},
      {},
      { '.agents': { skills: { mine: { 'SKILL.md': '' } } } },
    )
    await linkSkills({ ...aopts(dir), target: '*' })
    const foo = await linkSkills({
      ...aopts(dir),
      target: '#foo',
      apply: true,
    })
    t.strictSame(foo.removed, ['.agents/skills/bar'])
    t.equal(foo.unchanged.length, 2)
    const none = await linkSkills({
      ...aopts(dir),
      target: ':not(*)',
      apply: true,
    })
    t.strictSame(none.removed, [
      '.agents/skills/a',
      '.agents/skills/b',
    ])
    t.strictSame(readdirSync(resolve(dir, '.agents/skills')).sort(), [
      '.gitignore',
      'mine',
    ])
  })

  t.test('installs keep a live link of another package', async t => {
    const dir = project(t, {}, {}, { '.claude': {} })
    addSkill(dir, barDir, 'a')
    await linkSkills({
      ...aopts(dir),
      skillsDirs: ['.agents/skills'],
      target: '#foo',
    })
    const res = await linkSkills({
      ...aopts(dir),
      target: ':not(#foo)',
    })
    t.strictSame(res.conflicts, ['.agents/skills/a (@s/bar@1.0.0)'])
    t.equal(
      target(dir, '.agents/skills/a'),
      resolve(dir, fooDir, 'skills/a'),
    )
    t.equal(
      target(dir, '.claude/skills/a'),
      resolve(dir, barDir, 'skills/a'),
    )
  })

  t.test('symlinked dir: one link per skill', async t => {
    const dir = project(
      t,
      {},
      {},
      {
        '.agents': { skills: {} },
        '.cursor': {
          skills: t.fixture('symlink', '../.agents/skills'),
        },
      },
    )
    const res = await linkSkills({ ...aopts(dir), target: '#foo' })
    t.strictSame(res.dirs, ['.agents/skills'])
    t.strictSame(
      res.linked.map(s => s.mount),
      ['.agents/skills/a', '.agents/skills/b'],
    )
    const again = await linkSkills({ ...aopts(dir), target: '#foo' })
    t.equal(again.unchanged.length, 2)
    t.strictSame(again.removed, [])
  })

  t.test('symlinked target dir: not pruned', async t => {
    const dir = project(
      t,
      {},
      {},
      {
        shared: { skills: {} },
        '.claude': {
          skills: t.fixture('symlink', '../shared/skills'),
        },
      },
    )
    const res = await linkSkills({ ...aopts(dir), target: '#foo' })
    t.strictSame(
      res.linked.map(s => s.mount),
      [
        '.agents/skills/a',
        '.agents/skills/b',
        '.claude/skills/a',
        '.claude/skills/b',
      ],
    )
    for (const apply of [false, true]) {
      const again = await linkSkills({
        ...aopts(dir),
        target: '#foo',
        apply,
      })
      t.equal(again.unchanged.length, 4)
      t.strictSame(again.removed, [])
    }
    t.equal(gitignore(dir, 'shared/skills'), block('a', 'b'))
  })

  t.test('one package per name, in every dir', async t => {
    const dir = project(
      t,
      {},
      {},
      {
        '.agents': {
          skills: {
            a: t.fixture('symlink', `../../${fooDir}/skills/a`),
          },
        },
        '.claude': {},
      },
    )
    addSkill(dir, barDir, 'a')
    const res = await linkSkills({ ...aopts(dir), target: '*' })
    t.strictSame(res.conflicts, [
      '.agents/skills/a (@s/bar@1.0.0)',
      '.claude/skills/a (@s/bar@1.0.0)',
    ])
    t.equal(
      target(dir, '.claude/skills/a'),
      resolve(dir, fooDir, 'skills/a'),
      'the existing link wins',
    )
    // diverged: installs keep it, apply re-points
    mountSkill(
      {
        skill: 'a',
        path: resolve(realpathSync(dir), barDir, 'skills/a'),
      },
      sd(dir, '.claude/skills'),
    )
    const kept = await linkSkills({ ...aopts(dir), target: '*' })
    t.strictSame(kept.conflicts, [
      '.agents/skills/a (@s/bar@1.0.0)',
      '.claude/skills/a (foo@1.0.0)',
    ])
    t.equal(
      target(dir, '.claude/skills/a'),
      resolve(dir, barDir, 'skills/a'),
    )
    const applied = await linkSkills({
      ...aopts(dir),
      target: '*',
      apply: true,
    })
    t.strictSame(
      applied.linked.map(s => s.mount),
      ['.claude/skills/a'],
    )
    t.equal(
      target(dir, '.claude/skills/a'),
      resolve(dir, fooDir, 'skills/a'),
    )
  })

  t.test('a name taken over by the user: line dropped', async t => {
    const dir = project(t)
    await linkSkills({ ...aopts(dir), target: '#foo' })
    unlinkSync(resolve(dir, '.agents/skills/a'))
    mkdirSync(resolve(dir, '.agents/skills/a'))
    const res = await linkSkills({ ...aopts(dir), target: '#foo' })
    t.strictSame(res.conflicts, ['.agents/skills/a'])
    t.equal(gitignore(dir, '.agents/skills'), block('b'))
  })

  t.test('nothing selected: no dir made, cleanup runs', async t => {
    const dir = project(
      t,
      {},
      {},
      {
        '.kiro': {},
        '.claude': {
          skills: {
            gone: t.fixture(
              'symlink',
              '../../node_modules/.vlt/~npm~gone@1.0.0/node_modules/gone',
            ),
          },
        },
      },
    )
    const res = await linkSkills({
      ...aopts(dir),
      env: { CLAUDECODE: '1' },
      target: ':not(*)',
    })
    t.strictSame(res.removed, ['.claude/skills/gone'])
    t.notOk(existsSync(resolve(dir, '.agents')))
    t.notOk(existsSync(resolve(dir, '.kiro/skills')))
    t.notOk(existsSync(resolve(dir, '.claude/skills/.gitignore')))
    const bare = project(t, {}, {}, { '.claude': {} })
    await linkSkills({ ...aopts(bare), target: '#nothing' })
    t.strictSame(readdirSync(resolve(bare, '.claude')), [])
  })

  t.test('user-only dir: no .gitignore', async t => {
    const dir = project(
      t,
      {},
      {},
      {
        '.claude': { skills: { mine: { 'SKILL.md': '' } } },
      },
    )
    await linkSkills({
      ...aopts(dir),
      skillsDirs: ['custom'],
      target: '#foo',
    })
    t.equal(gitignore(dir, 'custom'), block('a', 'b'))
    t.strictSame(readdirSync(resolve(dir, '.claude/skills')), [
      'mine',
    ])
  })

  t.test('.gitignore', async t => {
    const dir = project(
      t,
      {},
      {},
      {
        '.claude': { skills: { '.gitignore': {} } },
      },
    )
    const res = await linkSkills({ ...aopts(dir), target: '#foo' })
    t.strictSame(res.gitignore, ['.claude/skills/.gitignore'])
    t.ok(isLink(dir, '.claude/skills/a'), 'linked anyway')
    t.equal(gitignore(dir, '.agents/skills'), block('a', 'b'))
    rmSync(resolve(dir, fooDir, 'skills/b'), { recursive: true })
    const gone = await linkSkills({ ...aopts(dir), target: '#foo' })
    t.strictSame(gone.removed, [
      '.agents/skills/b',
      '.claude/skills/b',
    ])
    t.equal(gitignore(dir, '.agents/skills'), block('a'))
  })

  t.test('skipped dirs', async t => {
    const dir = project(
      t,
      {},
      {},
      {
        '.claude': t.fixture('symlink', '..'),
      },
    )
    const skipped = ['.claude/skills (outside the project)']
    const res = await linkSkills({ ...aopts(dir), target: '#foo' })
    t.strictSame(res.skipped, skipped)
    t.strictSame(res.dirs, ['.agents/skills'])
    t.strictSame((await listSkills(aopts(dir))).skipped, skipped)
  })

  t.test('listSkills', async t => {
    const dir = project(t, {}, {}, { '.claude': {} })
    const fresh = await listSkills(aopts(dir))
    t.strictSame(fresh.dirs, both)
    t.notOk(existsSync(resolve(dir, '.agents')), 'nothing created')
    await linkSkills({ ...aopts(dir), target: '#foo' })
    t.strictSame(
      (await listSkills(aopts(dir))).skills.map(s => [
        s.skill,
        s.linked,
      ]),
      [
        ['a', both],
        ['b', both],
        ['bar', []],
      ],
    )
  })

  t.test('default env', async t => {
    const { CLAUDECODE: _, CLAUDE_CODE: __, ...env } = process.env
    t.intercept(process, 'env', { value: env })
    const dir = project(t)
    const res = await linkSkills({
      ...opts(dir),
      skillsDirs: undefined,
      target: '#foo',
    })
    t.strictSame(res.dirs, ['.agents/skills'])
  })

  t.test('no longer a target: re-pointed only', async t => {
    const oldId = reg('foo@0.9.0')
    const old = `node_modules/.vlt/${oldId}/node_modules/foo/skills/a`
    const dir = project(
      t,
      {},
      {},
      {
        '.agents': {
          skills: {
            // dangling: follows its package
            a: t.fixture('symlink', `../../${old}`),
            // another package's live link: kept
            b: t.fixture('symlink', `../../${barDir}`),
          },
        },
      },
    )
    const res = await linkSkills({ ...opts(dir), target: '#foo' })
    t.strictSame(
      res.linked.map(s => [s.mount, s.linked]),
      [
        ['skills/a', ['skills', '.agents/skills']],
        ['skills/b', ['skills']],
        ['.agents/skills/a', ['skills', '.agents/skills']],
      ],
    )
    t.strictSame(res.removed, [])
    t.equal(
      target(dir, '.agents/skills/a'),
      resolve(dir, fooDir, 'skills/a'),
    )
    t.equal(target(dir, '.agents/skills/b'), resolve(dir, barDir))
    const applied = await linkSkills({
      ...opts(dir),
      target: '#foo',
      apply: true,
    })
    t.strictSame(applied.removed, [
      '.agents/skills/a',
      '.agents/skills/b',
    ])
  })
})

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

  t.test('unset or :not(*): nothing', async t => {
    const dir = project(t, {
      gone: t.fixture(
        'symlink',
        '../node_modules/.vlt/~npm~gone@1.0.0/node_modules/gone',
      ),
    })
    for (const allowSkills of [undefined, ':not(*)']) {
      t.equal(
        await syncSkills({
          ...opts(dir),
          skillsDirs: undefined,
          env: { CLAUDECODE: '1' },
          graph: load(dir),
          allowSkills,
        }),
        undefined,
      )
    }
    t.ok(isLink(dir, 'skills/gone'), 'dangling link untouched')
    t.notOk(existsSync(resolve(dir, '.agents')), 'nothing created')
    t.notOk(existsSync(resolve(dir, '.claude')), 'nothing created')
  })
})
