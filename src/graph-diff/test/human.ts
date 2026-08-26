import t from 'tap'
import { diffLockfiles } from '../src/diff.ts'
import { humanDiffOutput } from '../src/human.ts'
import { joinDepIDTuple } from '@vltpkg/dep-id'
import {
  EMPTY,
  lockfile,
  pkg,
  ROOT,
  ws,
} from './fixtures/lockfile.ts'

const app = pkg('app', '1.0.0')

/** One diff exercising every renderer branch at once. */
const kitchenSink = () => {
  const base = lockfile(
    [
      { id: app, name: 'app' },
      { id: pkg('up', '1.0.0'), name: 'up' },
      { id: pkg('down', '2.0.0'), name: 'down' },
      { id: pkg('side', 'x'), name: 'side' },
      { id: pkg('gone', '1.0.0'), name: 'gone' },
      {
        id: pkg('touched', '1.0.0'),
        name: 'touched',
        integrity: 'sha512-a',
      },
      { id: pkg('peers', '1.0.0', '~peer.1'), name: 'peers' },
      { id: pkg('shuffled', '1.0.0', '~peer.1'), name: 'shuffled' },
    ],
    [
      { from: ROOT, name: 'app', to: app },
      { from: app, name: 'dropped', to: pkg('gone', '1.0.0') },
      { from: app, name: 'moved', to: pkg('up', '1.0.0') },
      { from: app, name: 'spec-only', spec: '^1', to: app },
      {
        from: app,
        name: 'nothing',
        type: 'peerOptional',
        to: 'MISSING',
      },
    ],
    { registry: 'https://a.example' },
  )
  const head = lockfile(
    [
      { id: app, name: 'app' },
      { id: pkg('up', '2.0.0'), name: 'up' },
      { id: pkg('down', '1.0.0'), name: 'down' },
      { id: pkg('side', 'y'), name: 'side' },
      { id: pkg('fresh', '1.0.0'), name: 'fresh' },
      {
        id: pkg('touched', '1.0.0'),
        name: 'touched',
        integrity: 'sha512-b',
      },
      { id: pkg('peers', '1.0.0', '~peer.9'), name: 'peers' },
      { id: pkg('shuffled', '1.0.0', '~peer.2'), name: 'shuffled' },
      { id: pkg('shuffled', '1.0.0', '~peer.3'), name: 'shuffled' },
    ],
    [
      { from: ROOT, name: 'app', to: app },
      { from: app, name: 'added', to: pkg('fresh', '1.0.0') },
      { from: app, name: 'moved', to: pkg('down', '1.0.0') },
      {
        from: app,
        name: 'spec-only',
        type: 'dev',
        spec: '^2',
        to: app,
      },
      { from: app, name: 'nothing', type: 'peerOptional', to: app },
    ],
    { registry: 'https://b.example' },
  )
  return diffLockfiles(base, head)
}

t.test('every mutation kind renders', async t => {
  const diff = kitchenSink()
  t.matchSnapshot(
    humanDiffOutput(diff, { identity: true }),
    'human output',
  )
})

t.test('identity-only noise collapses by default', async t => {
  const diff = kitchenSink()
  const collapsed = humanDiffOutput(diff)
  t.match(collapsed, /identity-only \(pass --identity-only to show\)/)
  t.notMatch(collapsed, /peer variant/, 'regroupings hidden')
  t.ok(
    collapsed.length <
      humanDiffOutput(diff, { identity: true }).length,
    'collapsed output is shorter',
  )
})

t.test('colors', async t => {
  const diff = kitchenSink()
  t.match(humanDiffOutput(diff, { colors: true }), /\[3[0-9]m/)
  t.notMatch(humanDiffOutput(diff), /\[/, 'plain by default')
})

t.test('empty diff says so', async t => {
  t.match(
    humanDiffOutput(diffLockfiles(EMPTY, EMPTY)),
    /No changes\./,
  )
})

t.test(
  'region with only hidden mutations is skipped entirely',
  async t => {
    const diff = diffLockfiles(
      lockfile(
        [{ id: pkg('foo', '1.0.0', '~peer.1'), name: 'foo' }],
        [
          {
            from: ws('a/b'),
            name: 'foo',
            to: pkg('foo', '1.0.0', '~peer.1'),
          },
        ],
      ),
      lockfile(
        [{ id: pkg('foo', '1.0.0', '~peer.2'), name: 'foo' }],
        [
          {
            from: ws('a/b'),
            name: 'foo',
            to: pkg('foo', '1.0.0', '~peer.2'),
          },
        ],
      ),
    )
    t.notMatch(humanDiffOutput(diff), /a\/b/)
    t.match(humanDiffOutput(diff, { identity: true }), /a\/b/)
  },
)

t.test('renders ids that carry no version or registry', async t => {
  const git = (extra: string) =>
    joinDepIDTuple(['git', 'github:a/b', 'main', extra])
  const diff = diffLockfiles(
    lockfile(
      [{ id: git('peer.1'), name: 'b' }],
      [{ from: ROOT, name: 'b', to: git('peer.1') }],
    ),
    lockfile(
      [{ id: git('peer.2'), name: 'b' }],
      [
        { from: ROOT, name: 'b', to: git('peer.2') },
        {
          from: ROOT,
          name: 'missing',
          type: 'peerOptional',
          to: 'MISSING',
        },
      ],
    ),
  )
  const out = humanDiffOutput(diff, { identity: true })
  t.match(out, /\bb\b/, 'a versionless package prints as a bare name')
  t.match(out, /-> MISSING/, 'a MISSING target is spelled out')
  t.notMatch(
    out,
    /undefined/,
    'never leaks undefined into the output',
  )
})

t.test('a regroup with no version and no peer hash', async t => {
  const bare = (v: string) => pkg('foo', v)
  const diff = diffLockfiles(
    lockfile([{ id: bare('1.0.0'), name: 'foo' }], []),
    lockfile(
      [
        { id: bare('1.0.0'), name: 'foo' },
        { id: pkg('foo', '1.0.0', ':x'), name: 'foo' },
      ],
      [],
    ),
  )
  t.notMatch(
    humanDiffOutput(diff, { identity: true }),
    /undefined/,
    'missing optional fields render as empty, not undefined',
  )
})

t.test('versionless ids in every renderer branch', async t => {
  const git = (ref: string, extra?: string) =>
    joinDepIDTuple(['git', 'github:a/b', ref, extra])
  const diff = diffLockfiles(
    lockfile(
      [
        { id: git('v1'), name: 'moved' },
        { id: git('main', ':x'), name: 'tagged' },
        { id: git('peers', 'peer.1'), name: 'peers' },
      ],
      [],
    ),
    lockfile(
      [
        { id: git('v2'), name: 'moved' },
        { id: git('main'), name: 'tagged' },
        { id: git('peers', 'peer.2'), name: 'peers' },
        { id: git('peers', 'peer.3'), name: 'peers' },
      ],
      [],
    ),
  )
  const out = humanDiffOutput(diff, { identity: true })
  t.notMatch(out, /undefined/, 'no undefined leaks anywhere')
  t.matchSnapshot(out, 'versionless output')
})

t.test('a change reaching past its region says so', async t => {
  const shared = (v: string) => pkg('shared', v)
  const mid = pkg('mid', '1.0.0')
  const at = (v: string) => [
    { id: shared(v), name: 'shared' },
    { id: mid, name: 'mid' },
  ]
  const edges = (v: string) => [
    { from: ws('near'), name: 'shared', to: shared(v) },
    { from: ws('far'), name: 'mid', to: mid },
    { from: mid, name: 'shared', to: shared(v) },
  ]
  const diff = diffLockfiles(
    lockfile(at('1.0.0'), edges('1.0.0')),
    lockfile(at('2.0.0'), edges('2.0.0')),
  )
  t.match(
    humanDiffOutput(diff),
    /\+1 more workspaces/,
    'the region name alone would have under-reported this',
  )
})

t.test('a major bump and a downgrade are marked apart', async t => {
  const at = (v: string) =>
    lockfile([{ id: pkg('foo', v), name: 'foo' }], [])
  const render = (a: string, b: string) =>
    humanDiffOutput(diffLockfiles(at(a), at(b)))

  t.match(
    render('1.0.0', '2.0.0'),
    /\^\^ foo.*major/,
    'major upgrade',
  )
  t.match(
    render('2.0.0', '1.0.0'),
    /\^\^ foo.*major/,
    'major downgrade',
  )
  t.match(render('1.0.0', '1.0.1'), /\^ foo/, 'patch upgrade')
  t.match(render('1.0.1', '1.0.0'), /v foo/, 'patch downgrade')
  t.notMatch(render('1.0.0', '1.0.1'), /major/)
})
