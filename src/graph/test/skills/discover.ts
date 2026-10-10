import { joinDepIDTuple } from '@vltpkg/dep-id'
import { Spec } from '@vltpkg/spec'
import type { SpecOptions } from '@vltpkg/spec'
import { resolve } from 'node:path'
import { PathScurry } from 'path-scurry'
import t from 'tap'
import { Graph } from '../../src/graph.ts'
import type { Node } from '../../src/node.ts'
import {
  discoverSkills,
  readFrontmatter,
} from '../../src/skills/discover.ts'

const configData = {
  registry: 'https://registry.npmjs.org/',
  registries: { npm: 'https://registry.npmjs.org/' },
} satisfies SpecOptions

type Dir = NonNullable<Parameters<typeof t.testdir>[0]>

const fm = (name: string, description: string) =>
  `---\nname: ${name}\ndescription: ${description}\n---\n# body\n`

t.test('readFrontmatter', async t => {
  const dir = t.testdir({
    'no-fence.md': 'name: x\ndescription: y\n',
    'crlf.md': '---\r\nname: crlf\r\ndescription: yes\r\n---\r\n',
    'quoted.md': `---\nname: "dq"\ndescription: 'single quoted'\n---\n`,
    // same shape as @vltpkg/query's dss-query skill
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
      foo: {
        alpha: t.fixture('symlink', `../../${fooStore}/skills/alpha`),
        // vlt link, but to another skill
        beta: t.fixture('symlink', `../../${fooStore}/skills/alpha`),
      },
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
        ...store('node_modules@1.0.0', 'node_modules', {
          'SKILL.md': fm('unsafe', 'unsafe'),
        }),
        // unscoped, but reads as a scope dir
        ...store('@at@1.0.0', '@at', { 'SKILL.md': fm('at', 'at') }),
        // case-insensitive mount collisions
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
        // a skill named SKILL.md: its container would look like a user
        // skill dir
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
  place(foo, 'long@1')
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

  const skills = discoverSkills(
    graph.nodes.values(),
    new PathScurry(projectRoot),
    projectRoot,
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
    skills.map(s => [s.mount, s.version, s.description, s.linked]),
    [
      ['skills/@s/bar/bar', '1.0.0', 'Scoped root', false],
      ['skills/cas/Same', '1.0.0', 'dir', false],
      ['skills/col/same', '1.0.0', 'dir one', false],
      ['skills/dk/dk', '2.0.0', 'v2', false],
      ['skills/dn/dn', '2.0.0', 'v2', false],
      // same rank: highest version
      ['skills/dt/dt', '2.0.0', 'v2', false],
      ['skills/dup/dup', '3.0.0', 'v3', false],
      ['skills/dws/dws', '2.0.0', 'v2', false],
      ['skills/dz/dz', undefined, 'x', false],
      ['skills/foo/alpha', '1.0.0', 'Alpha skill', true],
      ['skills/foo/beta', '1.0.0', undefined, false],
      ['skills/foo/foo-root', '1.0.0', 'Root skill', false],
      // one of the case-insensitive mount twins
      ['skills/jsonstream/js', '2.0.0', 'lower', false],
      ['skills/long/long', '1.0.0', 'a'.repeat(1024), false],
      ['skills/sf/sf', '1.0.0', '[31mred text', false],
      ['skills/smd/other', '1.0.0', 'other', false],
    ],
  )
  const byMount = new Map(skills.map(s => [s.mount, s]))
  t.match(byMount.get('skills/@s/bar/bar'), {
    name: '@s/bar',
    id: id('@s/bar@1.0.0'),
    skill: 'bar',
    path: storeDir('@s/bar@1.0.0', '@s/bar'),
  })
  t.equal(
    byMount.get('skills/foo/alpha')?.path,
    resolve(storeDir('foo@1.0.0', 'foo'), 'skills/alpha'),
  )
  t.equal(
    byMount.get('skills/foo/foo-root')?.path,
    storeDir('foo@1.0.0', 'foo'),
  )
  t.equal(
    byMount.get('skills/col/same')?.path,
    resolve(storeDir('col@1.0.0', 'col'), 'skills/same'),
    'dir skill wins over root name collision',
  )

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
          projectRoot,
        ),
        [{ mount: 'skills/foo/foo', linked: false }],
      )
    },
  )
})
