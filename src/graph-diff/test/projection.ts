import t from 'tap'
import {
  canonicalIdentity,
  depName,
  project,
} from '../src/projection.ts'
import { joinDepIDTuple } from '@vltpkg/dep-id'
import { lockfile, pkg, ROOT, ws } from './fixtures/lockfile.ts'

const foo = pkg('foo', '1.0.0')
const bar = pkg('bar', '2.0.0')

t.test('nodes, edges, importers, dependents', async t => {
  const g = project(
    lockfile(
      [
        { id: foo, name: 'foo', flags: 2, integrity: 'sha512-aaa' },
        { id: bar, name: 'bar', flags: 1 },
      ],
      [
        { from: ROOT, name: 'foo', type: 'dev', spec: '^1', to: foo },
        { from: ws('www/docs'), name: 'foo', to: foo },
        { from: foo, name: 'bar', type: 'optional', to: bar },
      ],
    ),
  )

  // importers are the edge sources absent from `nodes`, and the lockfile
  // deliberately never writes them there
  t.strictSame(
    [...g.importers].sort(),
    [ROOT, ws('www/docs')].sort(),
    'importers synthesized from edge sources',
  )
  t.equal(g.nodes.get(ROOT)?.name, '.', 'root labelled by path')
  t.equal(
    g.nodes.get(ws('www/docs'))?.name,
    'www/docs',
    'workspace labelled by decoded path',
  )
  t.equal(g.nodes.get(ROOT)?.importer, true)

  t.match(g.nodes.get(foo), {
    name: 'foo',
    version: '1.0.0',
    type: 'registry',
    integrity: 'sha512-aaa',
    dev: true,
    optional: false,
    importer: false,
  })
  t.match(g.nodes.get(bar), { dev: false, optional: true })

  t.match(g.edges.get(`${foo} bar`), {
    from: foo,
    name: 'bar',
    type: 'optional',
    spec: '*',
    to: bar,
  })
  t.strictSame(
    g.dependents.get(foo)?.map(e => e.from),
    [ROOT, ws('www/docs')],
    'reverse index lists every slot pointing at foo',
  )
  t.equal(
    g.dependents.get(ROOT),
    undefined,
    'a node nothing points at has no entry',
  )
})

t.test('specs may contain spaces, dep names may not', async t => {
  const g = project(
    lockfile(
      [{ id: foo, name: 'foo' }],
      [
        {
          from: ROOT,
          name: 'foo',
          spec: 'catalog: some thing',
          to: foo,
        },
      ],
    ),
  )
  t.match(g.edges.get(`${ROOT} foo`), {
    spec: 'catalog: some thing',
    to: foo,
  })
})

t.test('MISSING is a target value, not an absence', async t => {
  const g = project(
    lockfile(
      [{ id: foo, name: 'foo' }],
      [
        {
          from: foo,
          name: 'gone',
          type: 'peerOptional',
          to: 'MISSING',
        },
      ],
    ),
  )
  t.equal(g.edges.get(`${foo} gone`)?.to, 'MISSING')
  t.equal(g.dependents.size, 0, 'MISSING targets get no reverse edge')
})

t.test('non-registry ids have no version', async t => {
  const g = project(
    lockfile([], [{ from: ROOT, name: 'w', to: ws('a/b') }]),
  )
  t.equal(g.nodes.get(ws('a/b'))?.version, undefined)
})

t.test('bad input', async t => {
  const raw = (edges: Record<string, string>) =>
    ({ lockfileVersion: 1, options: {}, nodes: {}, edges }) as never
  t.throws(
    () => project(raw({ [`${ROOT} foo`]: 'prod ^1' })),
    /unparseable lockfile edge/,
    'an edge value with no target',
  )
  t.throws(
    () => project(raw({ [`${ROOT} foo`]: `nope ^1 ${foo}` })),
    /unsupported dependency type/,
  )
})

t.test(
  'canonicalIdentity ignores registry, peer set and modifier',
  async t => {
    t.equal(
      canonicalIdentity(pkg('foo', '1.0.0', '~peer.1')),
      canonicalIdentity(pkg('foo', '1.0.0', '~peer.99')),
      'peer set ignored',
    )
    t.equal(
      canonicalIdentity(pkg('foo', '1.0.0', undefined, 'npm')),
      canonicalIdentity(pkg('foo', '1.0.0', undefined, 'vlt')),
      'registry ignored',
    )
    t.not(
      canonicalIdentity(pkg('foo', '1.0.0')),
      canonicalIdentity(pkg('foo', '2.0.0')),
      'version is part of identity',
    )
  },
)

t.test('git, remote and file ids', async t => {
  const git = joinDepIDTuple(['git', 'github:a/b', 'main', '~peer.1'])
  const remote = joinDepIDTuple(['remote', 'https://x.example/a.tgz'])
  const file = joinDepIDTuple(['file', './local'])
  const g = project(
    lockfile(
      [
        { id: git, name: 'b' },
        { id: remote, name: 'r' },
        { id: file, name: 'f' },
      ],
      [],
    ),
  )
  t.match(g.nodes.get(git), {
    type: 'git',
    version: undefined,
    peerSetHash: 'peer.1',
    registry: undefined,
  })
  t.match(g.nodes.get(remote), { type: 'remote', version: undefined })
  t.match(g.nodes.get(file), { type: 'file', name: 'f' })
})

t.test('modifiers are part of the id, not of identity', async t => {
  const plain = pkg('foo', '1.0.0')
  const modified = pkg('foo', '1.0.0', ':root > #foo')
  const g = project(
    lockfile(
      [
        { id: plain, name: 'foo' },
        { id: modified, name: 'foo' },
      ],
      [],
    ),
  )
  t.equal(g.nodes.get(modified)?.modifier, ':root > #foo')
  t.equal(g.nodes.get(plain)?.modifier, undefined)
  t.equal(canonicalIdentity(plain), canonicalIdentity(modified))
})

t.test('optional payload fields are omitted, never null', async t => {
  const bare = pkg('bare', '1.0.0')
  const full = pkg('full', '1.0.0')
  const g = project(
    lockfile(
      [
        { id: bare, name: 'bare' },
        {
          id: full,
          name: 'full',
          integrity: 'sha512-a',
          resolved: 'https://x.example/f.tgz',
          location: 'node_modules/.vlt/full',
          platform: { os: ['linux'] },
          bins: { full: './cli.js' },
        },
      ],
      [],
    ),
  )
  t.strictSame(
    Object.keys(g.nodes.get(bare) ?? {}).sort(),
    [
      'dev',
      'id',
      'importer',
      'name',
      'optional',
      'registry',
      'type',
      'version',
    ],
    'absent tuple slots produce absent keys, not nulls',
  )
  t.match(g.nodes.get(full), {
    integrity: 'sha512-a',
    resolved: 'https://x.example/f.tgz',
    location: 'node_modules/.vlt/full',
    platform: { os: ['linux'] },
    bins: { full: './cli.js' },
  })
})

t.test(
  'a registry id with no version parses as a bare name',
  async t => {
    const weird = joinDepIDTuple(['registry', '', 'noversion'])
    const g = project(
      lockfile([{ id: weird, name: 'noversion' }], []),
    )
    t.match(g.nodes.get(weird), {
      name: 'noversion',
      version: undefined,
    })
  },
)

t.test(
  'tolerates lockfile values that should not happen',
  async t => {
    // the lockfile is external JSON: a null name, an empty version, and an
    // edge value with no spaces at all all have to degrade, not throw
    const noVersion = joinDepIDTuple(['registry', '', 'foo@'])
    const rootFile = joinDepIDTuple(['file', ''])
    const g = project({
      lockfileVersion: 1,
      options: {},
      nodes: {
        [noVersion]: [0, null],
        [rootFile]: [0, null],
      },
      edges: {},
    } as never)
    t.match(g.nodes.get(noVersion), {
      name: 'foo',
      version: undefined,
    })
    t.equal(
      g.nodes.get(rootFile)?.name,
      '.',
      'an empty path is the root',
    )

    t.throws(
      () =>
        project({
          lockfileVersion: 1,
          options: {},
          nodes: {},
          edges: { [`${ROOT} foo`]: 'prod' },
        } as never),
      /unparseable lockfile edge/,
      'an edge value with no spaces at all',
    )
  },
)

t.test('canonicalIdentity of a versionless id', async t => {
  t.equal(canonicalIdentity(ws('a/b')), canonicalIdentity(ws('a/b')))
  t.not(canonicalIdentity(ws('a/b')), canonicalIdentity(ws('a/c')))
  t.not(
    canonicalIdentity(ws('a/b')),
    canonicalIdentity(pkg('a/b', '1.0.0')),
    'type is part of identity, so a workspace never matches a package',
  )
})

t.test('depName decodes rather than pattern-matches', async t => {
  t.equal(depName(pkg('@scope/thing', '1.0.0')), '@scope/thing')
  t.equal(depName(ws('www/docs')), 'www/docs', 'a + is a slash')
  t.equal(depName(ROOT), '.', 'and _d is a dot')
})
