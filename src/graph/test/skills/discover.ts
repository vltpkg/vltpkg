import { joinDepIDTuple } from '@vltpkg/dep-id'
import { Spec } from '@vltpkg/spec'
import type { SpecOptions } from '@vltpkg/spec'
import { mkdirSync, realpathSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { PathScurry } from 'path-scurry'
import t from 'tap'
import { Graph } from '../../src/graph.ts'
import type { Node } from '../../src/node.ts'
import {
  discoverSkills,
  readFrontmatter,
  shipsSkills,
} from '../../src/skills/discover.ts'
import type { SkillsDir } from '../../src/skills/dirs.ts'
import { readMounts } from '../../src/skills/mounts.ts'

const configData = {
  registry: 'https://registry.npmjs.org/',
  registries: { npm: 'https://registry.npmjs.org/' },
} satisfies SpecOptions

type Dir = NonNullable<Parameters<typeof t.testdir>[0]>

// vlt links in `<projectRoot>/skills`
const mountsIn = (projectRoot: string) => {
  const dir: SkillsDir = {
    dir: 'skills',
    real: resolve(realpathSync(projectRoot), 'skills'),
  }
  return readMounts([dir])
}

const fm = (name: string, description: string) =>
  `---\nname: ${name}\ndescription: ${description}\n---\n# body\n`

t.test('readFrontmatter', async t => {
  const dir = t.testdir({
    'no-fence.md': 'name: x\ndescription: y\n',
    'crlf.md': '---\r\nname: crlf\r\ndescription: yes\r\n---\r\n',
    'quoted.md': `---\nname: "dq"\ndescription: 'single quoted'\n---\n`,
    // same shape as the dss-query skill
    'multi.md': `---
name: dss-query
description:
  Explain and compose vlt Dependency Selector Syntax (DSS) queries —
  CSS-selector-like strings.

  Use when the user asks about DSS.
allowed-tools: [Read, Grep]
---
`,
    'folded.md': `---\nname: folded\ndescription: >\n  one\n  two\n---\n`,
    'literal.md': `---\ndescription: |\n  one\n  two\n---\n`,
    'strip.md': `---\ndescription: >-\n  a\n  b\nname: strip\n---\n`,
    'empty.md': `---\nname:\ndescription: ""\n---\n`,
    'nested.md': `---
metadata:
  name: nested
  description: nested desc
# a comment
license: MIT
name: top
---
`,
    'comment.md': `---\ndescription: one\n# comment\n  two\n---\n`,
    'trailing.md': `---\nname: foo # the name\ndescription: does x#1 # todo\n---\n`,
    'hash.md': `---\nname: # none\ndescription: "a # b"\n---\n`,
    'unterminated.md': `---\nname: x\ndescription: y\n`,
  })
  const read = (f: string) => readFrontmatter(resolve(dir, f))
  t.strictSame(read('no-fence.md'), {})
  t.strictSame(read('crlf.md'), { name: 'crlf', description: 'yes' })
  t.strictSame(read('quoted.md'), {
    name: 'dq',
    description: 'single quoted',
  })
  t.strictSame(read('multi.md'), {
    name: 'dss-query',
    description:
      'Explain and compose vlt Dependency Selector Syntax (DSS) ' +
      'queries — CSS-selector-like strings. Use when the user asks ' +
      'about DSS.',
  })
  t.strictSame(read('folded.md'), {
    name: 'folded',
    description: 'one two',
  })
  t.strictSame(read('literal.md'), { description: 'one two' })
  t.strictSame(read('strip.md'), {
    description: 'a b',
    name: 'strip',
  })
  t.strictSame(read('empty.md'), {
    name: undefined,
    description: undefined,
  })
  t.strictSame(read('nested.md'), { name: 'top' })
  t.strictSame(read('comment.md'), { description: 'one' })
  t.strictSame(read('trailing.md'), {
    name: 'foo',
    description: 'does x#1',
  })
  t.strictSame(read('hash.md'), {
    name: undefined,
    description: 'a # b',
  })
  t.strictSame(read('unterminated.md'), {})
  t.strictSame(read('missing.md'), {}, 'unreadable')
})

t.test('discoverSkills', async t => {
  const id = (n: string) => joinDepIDTuple(['registry', '', n])
  const store = (
    n: string,
    name: string,
    pkg: Dir,
  ): Record<string, Dir> => ({
    [id(n)]: { node_modules: { [name]: pkg } },
  })
  const fooStore = `node_modules/.vlt/${id('foo@1.0.0')}/node_modules/foo`
  const tgzId = joinDepIDTuple(['file', 'pkgs/tgz.tgz'])
  const projectRoot = t.testdir({
    'vlt.json': '{}',
    // importers are never scanned
    'SKILL.md': fm('root-project', 'nope'),
    local: {
      skills: { x: { 'SKILL.md': fm('x', 'not in store') } },
    },
    skills: {
      alpha: t.fixture('symlink', `../${fooStore}/skills/alpha`),
      // vlt link, but to another skill
      beta: t.fixture('symlink', `../${fooStore}/skills/alpha`),
    },
    node_modules: {
      '.vlt': {
        ...store('foo@1.0.0', 'foo', {
          skills: {
            alpha: { 'SKILL.md': fm('alpha', 'Alpha skill') },
            beta: { 'SKILL.md': 'no frontmatter' },
            '.hidden': { 'SKILL.md': fm('h', 'h') },
            'bad name': { 'SKILL.md': fm('b', 'b') },
            '@scope': { 'SKILL.md': fm('s', 's') },
            linked: t.fixture('symlink', './alpha'),
            nofile: { 'README.md': 'x' },
            dirmd: { 'SKILL.md': {} },
            'file.md': 'not a dir',
          },
          'SKILL.md': fm('foo-root', 'Root skill'),
        }),
        ...store('@s/bar@1.0.0', '@s', {
          bar: {
            'SKILL.md': fm('Invalid_Name', 'Scoped root'),
          },
        }),
        ...store('col@1.0.0', 'col', {
          skills: { same: { 'SKILL.md': fm('same', 'dir one') } },
          'SKILL.md': fm('same', 'root one'),
        }),
        ...store('sf@1.0.0', 'sf', {
          skills: 'a file',
          'SKILL.md': `---\ndescription: "\x1b[31mred\x00 text"\n---\n`,
        }),
        ...store('long@1.0.0', 'long', {
          'SKILL.md': fm('long', 'a'.repeat(2000)),
        }),
        ...store('none@1.0.0', 'none', { 'index.js': '' }),
        // package name never reaches the path
        ...store('node_modules@1.0.0', 'node_modules', {
          'SKILL.md': fm('unsafe', 'unsafe'),
        }),
        // fallback name `@at` is not a safe dir name
        ...store('@at@1.0.0', '@at', {
          'SKILL.md': fm('Bad_Name', 'at'),
        }),
        // same names from different packages: all listed
        ...store('cas@1.0.0', 'cas', {
          skills: { Same: { 'SKILL.md': fm('x', 'dir') } },
          'SKILL.md': fm('same', 'root'),
        }),
        ...store('JSONStream@1.0.0', 'JSONStream', {
          'SKILL.md': fm('js', 'upper'),
        }),
        ...store('jsonstream@2.0.0', 'jsonstream', {
          'SKILL.md': fm('js', 'lower'),
        }),
        ...store('rk@1.0.0', 'rk', { 'SKILL.md': fm('same', 'rk') }),
        // duplicates
        ...store('dup@1.0.0', 'dup', { 'SKILL.md': fm('dup', 'v1') }),
        ...store('dup@2.0.0', 'dup', { 'SKILL.md': fm('dup', 'v2') }),
        ...store('dup@3.0.0', 'dup', { 'SKILL.md': fm('dup', 'v3') }),
        ...store('dws@1.0.0', 'dws', { 'SKILL.md': fm('dws', 'v1') }),
        ...store('dws@2.0.0', 'dws', { 'SKILL.md': fm('dws', 'v2') }),
        ...store('dt@1.0.0', 'dt', { 'SKILL.md': fm('dt', 'v1') }),
        ...store('dt@2.0.0', 'dt', { 'SKILL.md': fm('dt', 'v2') }),
        ...store('dk@1.0.0', 'dk', { 'SKILL.md': fm('dk', 'v1') }),
        ...store('dk@2.0.0', 'dk', { 'SKILL.md': fm('dk', 'v2') }),
        ...store('dn@1.0.0', 'dn', { 'index.js': '' }),
        ...store('dn@2.0.0', 'dn', { 'SKILL.md': fm('dn', 'v2') }),
        // not semver: DepID order
        ...store('dz@x', 'dz', { 'SKILL.md': fm('dz', 'x') }),
        ...store('dz@y', 'dz', { 'SKILL.md': fm('dz', 'y') }),
        // a skill named SKILL.md: `skills/SKILL.md` would make the dir
        // look like a skill
        ...store('smd@1.0.0', 'smd', {
          skills: {
            'SKILL.md': { 'SKILL.md': fm('x', 'x') },
            other: { 'SKILL.md': fm('other', 'other') },
          },
        }),
        ...store('smdl@1.0.0', 'smdl', {
          skills: { 'skill.md': { 'SKILL.md': fm('y', 'y') } },
        }),
        ...store('skill.md@1.0.0', 'skill.md', {
          'SKILL.md': 'no frontmatter',
        }),
        // lockfile keeps a tarball's path as its location
        [tgzId]: {
          node_modules: { tgz: { 'SKILL.md': fm('tgz', 'tgz') } },
        },
      },
    },
  })

  const graph = new Graph({
    ...configData,
    mainManifest: { name: 'root', version: '1.0.0' },
    projectRoot,
  })
  const root = graph.mainImporter
  const ws = graph.addNode(joinDepIDTuple(['workspace', 'ws']), {
    name: 'ws',
    version: '1.0.0',
  })
  ws.setImporterLocation('./ws')
  const place = (from: Node, spec: string, version = '1.0.0') => {
    const s = Spec.parse(spec, configData)
    const node = graph.placePackage(from, 'prod', s, {
      name: s.name,
      version,
    })
    if (!node) throw new Error('failed to place ' + spec)
    return node
  }
  const foo = place(root, 'foo@1')
  place(root, '@s/bar@1')
  place(root, 'col@1')
  place(root, 'sf@1')
  const long = place(foo, 'long@1')
  place(foo, 'rk@1')
  place(root, 'none@1')
  // unsafe name, cannot be parsed as a spec
  graph.addNode(id('node_modules@1.0.0'), {
    name: 'node_modules',
    version: '1.0.0',
  })
  graph.addNode(id('@at@1.0.0'), { name: '@at', version: '1.0.0' })
  place(root, 'cas@1')
  graph.addNode(id('JSONStream@1.0.0'), {
    name: 'JSONStream',
    version: '1.0.0',
  })
  graph.addNode(id('jsonstream@2.0.0'), {
    name: 'jsonstream',
    version: '2.0.0',
  })
  place(foo, 'dup@1')
  place(ws, 'dup@2', '2.0.0')
  const dup3 = place(foo, 'dup@3', '3.0.0')
  graph.addEdge('prod', Spec.parse('dup@3', configData), root, dup3)
  place(foo, 'dws@1')
  place(ws, 'dws@2', '2.0.0')
  place(foo, 'dt@2', '2.0.0')
  place(foo, 'dt@1')
  place(root, 'dk@2', '2.0.0')
  place(foo, 'dk@1')
  place(root, 'dn@1')
  place(foo, 'dn@2', '2.0.0')
  graph.addNode(id('dz@x'), { name: 'dz' })
  graph.addNode(id('dz@y'), { name: 'dz', version: 'y' })
  place(root, 'smd@1')
  place(root, 'smdl@1')
  graph.addNode(id('skill.md@1.0.0'), {
    name: 'skill.md',
    version: '1.0.0',
  })
  graph.addNode(tgzId, { name: 'tgz', version: '1.0.0' })
  const local = graph.addNode(joinDepIDTuple(['file', 'local']), {
    name: 'local',
    version: '1.0.0',
  })
  local.location = './local'

  const { skills, scanned } = discoverSkills(
    graph.nodes.values(),
    new PathScurry(projectRoot),
    mountsIn(projectRoot),
  )
  const storeDir = (n: string, name: string) =>
    resolve(
      projectRoot,
      'node_modules/.vlt',
      id(n),
      'node_modules',
      name,
    )

  t.strictSame(
    skills.map(s => [s.skill, s.version, s.description, s.linked]),
    [
      ['alpha', '1.0.0', 'Alpha skill', ['skills']],
      ['bar', '1.0.0', 'Scoped root', []],
      ['beta', '1.0.0', undefined, []],
      ['dk', '2.0.0', 'v2', []],
      // same rank: highest version
      ['dt', '2.0.0', 'v2', []],
      ['dup', '3.0.0', 'v3', []],
      ['dws', '2.0.0', 'v2', []],
      ['dz', undefined, 'x', []],
      ['foo-root', '1.0.0', 'Root skill', []],
      // same name, same rank: DepID order
      ['js', '1.0.0', 'upper', []],
      ['js', '2.0.0', 'lower', []],
      ['long', '1.0.0', 'a'.repeat(1024), []],
      ['other', '1.0.0', 'other', []],
      // root SKILL.md first; case-insensitive name: rank, then DepID
      ['same', '1.0.0', 'root', []],
      ['same', '1.0.0', 'root one', []],
      ['same', '1.0.0', 'rk', []],
      ['sf', '1.0.0', '[31mred text', []],
      ['unsafe', '1.0.0', 'unsafe', []],
    ],
  )
  t.strictSame(
    skills
      .filter(s => s.skill === 'same' || s.skill === 'js')
      .map(s => s.name),
    ['JSONStream', 'jsonstream', 'cas', 'col', 'rk'],
  )
  const byName = new Map(skills.map(s => [s.skill, s]))
  t.match(byName.get('bar'), {
    name: '@s/bar',
    id: id('@s/bar@1.0.0'),
    skill: 'bar',
    path: storeDir('@s/bar@1.0.0', '@s/bar'),
  })
  t.equal(
    byName.get('alpha')?.path,
    resolve(storeDir('foo@1.0.0', 'foo'), 'skills/alpha'),
  )
  t.equal(byName.get('foo-root')?.path, storeDir('foo@1.0.0', 'foo'))
  t.equal(
    skills.find(s => s.name === 'col')?.path,
    storeDir('col@1.0.0', 'col'),
    'root SKILL.md wins a name collision',
  )
  t.strictSame(
    skills.flatMap(s =>
      s.frontmatterName ? [[s.skill, s.frontmatterName]] : [],
    ),
    [['bar', 'Invalid_Name']],
    'frontmatter name, when not the skill name',
  )
  t.equal(byName.get('dws')?.alias, undefined, 'same name')
  t.equal(byName.get('long')?.alias, undefined, 'transitive')

  t.test('scanned', async t => {
    t.strictSame(scanned.get(id('none@1.0.0')), [], 'ships none')
    t.strictSame(
      scanned.get(id('dn@1.0.0')),
      [],
      'picked, ships none',
    )
    t.strictSame(scanned.get(id('dn@2.0.0')), [
      { skill: 'dn', path: storeDir('dn@2.0.0', 'dn') },
    ])
    t.strictSame(scanned.get(long.id), [
      { skill: 'long', path: storeDir('long@1.0.0', 'long') },
    ])
    t.strictSame(
      scanned.get(foo.id)?.map(f => f.skill),
      ['foo-root', 'alpha', 'beta'],
    )
    t.notOk(scanned.has(tgzId), 'tarball')
    t.notOk(scanned.has(local.id), 'local')
    t.notOk(scanned.has(root.id), 'importer')
    t.notOk(scanned.has(ws.id), 'workspace')
  })

  t.test(
    'skills dir that is a file: links are not followed',
    async t => {
      const projectRoot = t.testdir({
        'vlt.json': '{}',
        skills: 'a file',
        node_modules: {
          '.vlt': store('foo@1.0.0', 'foo', {
            'SKILL.md': fm('foo', 'x'),
          }),
        },
      })
      const graph = new Graph({
        ...configData,
        mainManifest: { name: 'root', version: '1.0.0' },
        projectRoot,
      })
      graph.placePackage(
        graph.mainImporter,
        'prod',
        Spec.parse('foo@1', configData),
        { name: 'foo', version: '1.0.0' },
      )
      t.match(
        discoverSkills(
          graph.nodes.values(),
          new PathScurry(projectRoot),
          mountsIn(projectRoot),
        ).skills,
        [{ skill: 'foo', linked: [] }],
      )
    },
  )

  t.test('dist/skills, .agents/skills', async t => {
    const skill = (d: string) => ({ 'SKILL.md': fm('x', d) })
    const projectRoot = t.testdir({
      'vlt.json': '{}',
      node_modules: {
        '.vlt': {
          ...store('foo@1.0.0', 'foo', {
            skills: { a: skill('src') },
            dist: { skills: { A: skill('dist'), b: skill('dist') } },
            '.agents': {
              skills: { b: skill('agents'), c: skill('agents') },
            },
          }),
          // not followed: symlinks, files
          ...store('bar@1.0.0', 'bar', {
            real: { skills: { x: skill('real') } },
            dist: t.fixture('symlink', './real'),
            '.agents': {
              skills: t.fixture('symlink', '../real/skills'),
            },
          }),
          ...store('baz@1.0.0', 'baz', {
            dist: 'a file',
            '.agents': { skills: 'a file' },
          }),
        },
      },
    })
    const graph = new Graph({
      ...configData,
      mainManifest: { name: 'root', version: '1.0.0' },
      projectRoot,
    })
    for (const n of ['foo', 'bar', 'baz']) {
      graph.placePackage(
        graph.mainImporter,
        'prod',
        Spec.parse(`${n}@1`, configData),
        { name: n, version: '1.0.0' },
      )
    }
    const pkg = resolve(
      realpathSync(projectRoot),
      'node_modules/.vlt',
      id('foo@1.0.0'),
      'node_modules/foo',
    )
    t.strictSame(
      discoverSkills(
        graph.nodes.values(),
        new PathScurry(projectRoot),
      ).skills.map(s => [s.skill, s.description, s.path]),
      [
        ['a', 'src', resolve(pkg, 'skills/a')],
        ['b', 'dist', resolve(pkg, 'dist/skills/b')],
        ['c', 'agents', resolve(pkg, '.agents/skills/c')],
      ],
      'first name wins: skills, dist/skills, .agents/skills',
    )
  })

  t.test('frontmatter name', async t => {
    const projectRoot = t.testdir({
      'vlt.json': '{}',
      node_modules: {
        '.vlt': {
          ...store('foo@1.0.0', 'foo', {
            skills: {
              a: { 'SKILL.md': fm('My Skill', 'x') },
              b: { 'SKILL.md': fm('b', 'x') },
              c: { 'SKILL.md': fm('C', 'x') },
              d: { 'SKILL.md': 'no frontmatter' },
              e: { 'SKILL.md': fm('\x1b[1mE2', 'x') },
            },
          }),
          ...store('bar@1.0.0', 'bar', {
            'SKILL.md': fm('Bad_Name', 'x'),
          }),
        },
      },
    })
    const graph = new Graph({
      ...configData,
      mainManifest: { name: 'root', version: '1.0.0' },
      projectRoot,
    })
    for (const n of ['foo', 'bar']) {
      graph.placePackage(
        graph.mainImporter,
        'prod',
        Spec.parse(`${n}@1`, configData),
        { name: n, version: '1.0.0' },
      )
    }
    const { skills } = discoverSkills(
      graph.nodes.values(),
      new PathScurry(projectRoot),
    )
    t.strictSame(
      skills.map(s => [
        s.skill,
        'frontmatterName' in s,
        s.frontmatterName,
      ]),
      [
        ['a', true, 'My Skill'],
        ['b', false, undefined],
        ['bar', true, 'Bad_Name'],
        ['c', false, undefined],
        ['d', false, undefined],
        ['e', true, '[1mE2'],
      ],
      'set only when it differs from the skill name, sanitized',
    )
  })

  t.test('one skill per name, any case', async t => {
    const projectRoot = t.testdir({
      'vlt.json': '{}',
      node_modules: {
        '.vlt': store('foo@1.0.0', 'foo', {
          skills: { Foo: { 'SKILL.md': fm('x', 'upper') } },
        }),
      },
    })
    // case-sensitive fs only
    const lower = resolve(
      projectRoot,
      'node_modules/.vlt',
      id('foo@1.0.0'),
      'node_modules/foo/skills/foo',
    )
    try {
      mkdirSync(lower)
      writeFileSync(resolve(lower, 'SKILL.md'), fm('x', 'lower'))
    } catch {}
    const graph = new Graph({
      ...configData,
      mainManifest: { name: 'root', version: '1.0.0' },
      projectRoot,
    })
    graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('foo@1', configData),
      { name: 'foo', version: '1.0.0' },
    )
    t.strictSame(
      discoverSkills(
        graph.nodes.values(),
        new PathScurry(projectRoot),
      ).skills.map(s => [s.skill, s.description]),
      [['Foo', 'upper']],
    )
  })

  t.test('alias, version pick, peer forks', async t => {
    const git = (repo: string, extra?: string) =>
      joinDepIDTuple(['git', `github:${repo}`, '', extra])
    const gitId = git('vercel-labs/skills')
    const pfId = git('a/pf')
    const pfFork = git('a/pf', 'peer.x')
    const projectRoot = t.testdir({
      'vlt.json': '{}',
      skills: {
        'find-skills': t.fixture(
          'symlink',
          `../node_modules/.vlt/${gitId}/node_modules/skills/skills/find-skills`,
        ),
      },
      node_modules: {
        '.vlt': {
          [gitId]: {
            node_modules: {
              skills: {
                skills: {
                  'find-skills': {
                    'SKILL.md': fm('find-skills', 'f'),
                  },
                },
              },
            },
          },
          ...store('xv@1.0.0', 'xv', {
            skills: {
              xa: { 'SKILL.md': fm('xa', 'v1') },
              xb: { 'SKILL.md': fm('xb', 'v1') },
            },
          }),
          ...store('xv@2.0.0', 'xv', {
            skills: { xa: { 'SKILL.md': fm('xa', 'v2') } },
          }),
          [pfId]: {
            node_modules: { pf: { 'SKILL.md': fm('pf', 'base') } },
          },
          [pfFork]: {
            node_modules: { pf: { 'SKILL.md': fm('pf', 'fork') } },
          },
        },
      },
    })
    const graph = new Graph({
      ...configData,
      mainManifest: { name: 'root', version: '1.0.0' },
      projectRoot,
    })
    const root = graph.mainImporter
    const place = (from: Node, spec: string, version: string) => {
      const s = Spec.parse(spec, configData)
      const name = spec.startsWith('vercelskills') ? 'skills' : s.name
      const node = graph.placePackage(from, 'prod', s, {
        name,
        version,
      })
      if (!node) throw new Error('failed to place ' + spec)
      return node
    }
    const vs = place(
      root,
      'vercelskills@github:vercel-labs/skills',
      '1.7.2',
    )
    t.equal(vs.id, gitId)
    place(root, 'xv@2', '2.0.0')
    place(vs, 'xv@1', '1.0.0')
    graph.addNode(pfId, { name: 'pf', version: '1.0.0' })
    graph.addNode(pfFork, { name: 'pf', version: '1.0.0' })
    const { skills, scanned } = discoverSkills(
      graph.nodes.values(),
      new PathScurry(projectRoot),
      mountsIn(projectRoot),
    )
    t.strictSame(
      skills.map(s => [
        s.skill,
        s.name,
        s.alias,
        s.version,
        s.linked,
      ]),
      [
        [
          'find-skills',
          'skills',
          'vercelskills',
          '1.7.2',
          ['skills'],
        ],
        ['pf', 'pf', undefined, '1.0.0', []],
        ['xa', 'xv', undefined, '2.0.0', []],
      ],
    )
    t.equal(skills[1]?.id, pfId, 'one row per git package')
    t.strictSame(
      scanned.get(id('xv@1.0.0'))?.map(f => f.skill),
      ['xa', 'xb'],
      'older version scanned, not listed',
    )
    t.ok(scanned.has(pfFork))
  })

  t.test('realpaths, linked dirs', async t => {
    const base = t.testdir({
      link: t.fixture('symlink', './p'),
      p: {
        'vlt.json': '{}',
        node_modules: {
          '.vlt': store('foo@1.0.0', 'foo', {
            'SKILL.md': fm('foo', 'x'),
          }),
        },
      },
    })
    const projectRoot = resolve(base, 'link')
    const graph = new Graph({
      ...configData,
      mainManifest: { name: 'root', version: '1.0.0' },
      projectRoot,
    })
    graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('foo@1', configData),
      { name: 'foo', version: '1.0.0' },
    )
    const pkg = `node_modules/.vlt/${id('foo@1.0.0')}/node_modules/foo`
    const path = resolve(realpathSync(base), 'p', pkg)
    const m = (dir: string, name: string, target: string) => ({
      dir: { dir, real: '' },
      name,
      mount: `${dir}/${name}`,
      link: '',
      target,
    })
    const [s] = discoverSkills(
      graph.nodes.values(),
      new PathScurry(projectRoot),
      [
        m('.agents/skills', 'foo', resolve(projectRoot, pkg)),
        m('.agents/skills', 'FOO', path),
        m('.claude/skills', 'foo', path),
        // another name
        m('.kiro/skills', 'bar', path),
      ],
    ).skills
    t.equal(s?.path, path, 'realpath')
    t.strictSame(s?.linked, ['.agents/skills', '.claude/skills'])
  })
})

t.test('shipsSkills', async t => {
  const id = (n: string) => joinDepIDTuple(['registry', '', n])
  const tgzId = joinDepIDTuple(['file', 'pkgs/tgz.tgz'])
  const pkg = (name: string, files: Dir) => ({
    node_modules: { [name]: files },
  })
  // fresh objects: t.testdir() rejects shared ones
  const skill = () => ({ 'SKILL.md': fm('x', 'x') })
  const projectRoot = t.testdir({
    'vlt.json': '{}',
    'SKILL.md': fm('root', 'importer'),
    local: { skills: { x: skill() } },
    node_modules: {
      '.vlt': {
        [id('dir@1.0.0')]: pkg('dir', { skills: { x: skill() } }),
        [id('root@1.0.0')]: pkg('root', skill()),
        [id('dist@1.0.0')]: pkg('dist', {
          dist: { skills: { x: skill() } },
        }),
        [id('agents@1.0.0')]: pkg('agents', {
          '.agents': { skills: { x: skill() } },
        }),
        [id('none@1.0.0')]: pkg('none', { 'index.js': '' }),
        [id('bad@1.0.0')]: pkg('bad', {
          skills: { '.hidden': skill(), 'bad name': skill() },
        }),
        [id('smd@1.0.0')]: pkg('smd', { skills: skill() }),
        [id('loc@1.0.0')]: pkg('loc', skill()),
        [tgzId]: pkg('tgz', skill()),
      },
    },
  })
  const graph = new Graph({
    ...configData,
    mainManifest: { name: 'root', version: '1.0.0' },
    projectRoot,
  })
  const node = (n: string) => {
    const s = Spec.parse(`${n}@1`, configData)
    const placed = graph.placePackage(graph.mainImporter, 'prod', s, {
      name: n,
      version: '1.0.0',
    })
    if (!placed) throw new Error('failed to place ' + n)
    return placed
  }
  t.equal(shipsSkills(node('dir')), true, 'skills dir')
  t.equal(shipsSkills(node('root')), true, 'root SKILL.md')
  t.equal(shipsSkills(node('dist')), true, 'dist/skills')
  t.equal(shipsSkills(node('agents')), true, '.agents/skills')
  t.equal(shipsSkills(node('none')), false, 'nothing')
  t.equal(shipsSkills(node('bad')), false, 'bad dir names only')
  t.equal(shipsSkills(node('smd')), false, 'skills/SKILL.md only')
  t.equal(shipsSkills(graph.mainImporter), false, 'importer')
  const loc = node('loc')
  loc.location = './local'
  t.equal(shipsSkills(loc), false, 'not in the store')
  const tgz = graph.addNode(tgzId, { name: 'tgz', version: '1.0.0' })
  t.ok(tgz.inVltStore())
  t.equal(shipsSkills(tgz), false, 'tarball')
})
