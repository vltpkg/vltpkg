import { baseDepID, joinDepIDTuple } from '@vltpkg/dep-id'
import * as fs from 'node:fs'
import { existsSync, lstatSync, readlinkSync } from 'node:fs'
import * as path from 'node:path'
import { dirname, isAbsolute, relative, resolve } from 'node:path'
import t from 'tap'
import type { Test } from 'tap'
import type { Skill } from '../../src/skills/discover.ts'
import {
  mountPath,
  mountSkill,
  mountTarget,
  ownerOf,
  packageKey,
  readMounts,
  samePath,
  unmountSkill,
} from '../../src/skills/mounts.ts'

const store = 'node_modules/.vlt/~npm~foo@1.0.0/node_modules/foo'
const scopedStore =
  'node_modules/.vlt/~npm~@s+bar@1.0.0/node_modules/@s/bar'
const fooId = joinDepIDTuple(['registry', '', 'foo@1.0.0'])
const barId = joinDepIDTuple(['registry', '', '@s/bar@1.0.0'])

type Dir = NonNullable<Parameters<typeof t.testdir>[0]>

const project = (t: Test, skills?: Dir) =>
  t.testdir({
    'vlt.json': '{}',
    ...(skills ? { skills } : {}),
    outside: {
      a: { 'SKILL.md': '' },
      // another project's store, eg, before a move/copy
      node_modules: { '.vlt': { x: { a: { 'SKILL.md': '' } } } },
    },
    node_modules: {
      '.vlt': {
        '~npm~foo@1.0.0': {
          node_modules: {
            foo: {
              skills: {
                a: { 'SKILL.md': '' },
                b: { 'SKILL.md': '' },
              },
            },
          },
        },
        '~npm~@s+bar@1.0.0': {
          node_modules: {
            '@s': { bar: { skills: { c: { 'SKILL.md': '' } } } },
          },
        },
      },
    },
  })

const skill = (
  projectRoot: string,
  name: string,
  s: string,
  pkgDir = store,
): Skill => ({
  name,
  id: joinDepIDTuple(['registry', '', `${name}@1.0.0`]),
  skill: s,
  path: resolve(projectRoot, pkgDir, 'skills', s),
  mount: `skills/${s}`,
  linked: false,
})

const target = (link: string) =>
  resolve(dirname(link), readlinkSync(link))

t.test('samePath + mountPath', async t => {
  t.ok(samePath('/a/b/../c', '/a/c'))
  t.notOk(samePath('/a/b', '/a/c'))
  t.equal(mountPath('/p', 'skills/x'), resolve('/p/skills/x'))
  t.intercept(process, 'platform', { value: 'linux' })
  t.notOk(samePath('/a/B', '/a/b'), 'case-sensitive on posix')
  t.intercept(process, 'platform', { value: 'win32' })
  t.ok(samePath('/a/B', '/a/b'), 'case-insensitive on win32')
})

t.test('lstat swallows errors', async t => {
  const { lstat } = await t.mockImport<
    typeof import('../../src/skills/mounts.ts')
  >('../../src/skills/mounts.ts', {
    'node:fs': {
      ...fs,
      lstatSync: () => {
        throw Object.assign(new Error('nope'), { code: 'ENOTDIR' })
      },
    },
  })
  t.equal(lstat('/x'), undefined)
})

t.test('mountTarget', async t => {
  const dir = project(t, {
    real: {},
    out: t.fixture('symlink', '../outside/a'),
    in: t.fixture('symlink', `../${store}/skills/a`),
    gone: t.fixture('symlink', `../${store}/skills/gone`),
    moved: t.fixture('symlink', '../outside/node_modules/.vlt/x/a'),
    upper: t.fixture('symlink', '../NODE_MODULES/.VLT/x/a'),
  })
  const link = (n: string) => resolve(dir, 'skills', n)
  t.equal(mountTarget(link('missing')), undefined)
  t.equal(mountTarget(resolve(dir, 'vlt.json/x')), undefined)
  t.equal(mountTarget(link('real')), undefined)
  t.equal(mountTarget(link('out')), undefined)
  t.equal(mountTarget(link('in')), resolve(dir, store, 'skills/a'))
  t.equal(
    mountTarget(link('gone')),
    resolve(dir, store, 'skills/gone'),
    'dangling links into the store are still managed',
  )
  t.equal(
    mountTarget(link('moved')),
    resolve(dir, 'outside/node_modules/.vlt/x/a'),
    'another vlt store',
  )
  if (process.platform !== 'win32') {
    t.equal(mountTarget(link('upper')), undefined)
  }

  t.test('strips the win32 \\\\?\\ prefix', async t => {
    const abs = resolve(dir, store, 'skills/a')
    const { mountTarget } = await t.mockImport<
      typeof import('../../src/skills/mounts.ts')
    >('../../src/skills/mounts.ts', {
      'node:fs': { ...fs, readlinkSync: () => `\\\\?\\${abs}` },
    })
    t.equal(mountTarget(link('in')), abs)
  })

  t.test('store check is case-insensitive on win32', async t => {
    t.intercept(process, 'platform', { value: 'win32' })
    t.equal(
      mountTarget(link('upper')),
      resolve(dir, 'NODE_MODULES/.VLT/x/a'),
    )
  })
})

t.test('ownerOf', async t => {
  const p = (s: string) => resolve('/p', s)
  const git = joinDepIDTuple(['git', 'github:vercel-labs/skills', ''])
  const peer = joinDepIDTuple(['registry', '', 'foo@1.0.0', 'peer.x'])
  t.equal(ownerOf(p(`${store}/skills/a`)), fooId)
  t.equal(ownerOf(p(scopedStore)), barId, 'scoped')
  t.equal(
    ownerOf(p(`node_modules/.vlt/${peer}/node_modules/foo`)),
    peer,
    'peer extra',
  )
  t.equal(
    ownerOf(
      p(`node_modules/.vlt/${git}/node_modules/skills/skills/x`),
    ),
    git,
    'git',
  )
  t.equal(
    ownerOf(
      p(
        `node_modules/.vlt/~npm~a@1.0.0/node_modules/a/node_modules/.vlt/${fooId}/x`,
      ),
    ),
    fooId,
    'last store segment',
  )
  t.equal(
    ownerOf(p('node_modules/.vlt/x/a')),
    undefined,
    'invalid DepID',
  )
  t.equal(ownerOf(p('outside/a')), undefined, 'no store segment')
  t.equal(ownerOf(p('node_modules/.vlt')), undefined, 'no DepID')

  t.test('case-sensitive on posix', async t => {
    t.intercept(process, 'platform', { value: 'linux' })
    t.equal(ownerOf(p(`NODE_MODULES/.VLT/${fooId}/x`)), undefined)
  })

  t.test(
    'win32: case-insensitive store, DepID case kept',
    async t => {
      t.intercept(process, 'platform', { value: 'win32' })
      const { ownerOf } = await t.mockImport<
        typeof import('../../src/skills/mounts.ts')
      >('../../src/skills/mounts.ts', { 'node:path': path.win32 })
      t.equal(
        ownerOf(
          'C:\\p\\NODE_MODULES\\.VLT\\~npm~Foo@1.0.0\\node_modules\\foo',
        ),
        '~npm~Foo@1.0.0',
      )
    },
  )
})

t.test('packageKey', async t => {
  const reg = (spec: string, extra?: string, registry = '') =>
    joinDepIDTuple(['registry', registry, spec, extra])
  t.equal(packageKey(reg('foo@1.0.0')), '~npm~foo')
  t.equal(packageKey(reg('@s/bar@1.0.0')), '~npm~@s+bar', 'scoped')
  t.equal(packageKey(reg('foo@1.0.0', 'peer.x')), '~npm~foo', 'peer')
  t.equal(packageKey(reg('foo')), '~npm~foo', 'no version')
  t.equal(
    packageKey(reg('@s/bar')),
    '~npm~@s+bar',
    'scoped, no version',
  )
  t.equal(
    packageKey(reg('foo@1.0.0', undefined, 'custom')),
    '~custom~foo',
    'another registry',
  )
  const git = joinDepIDTuple(['git', 'github:vercel-labs/skills', ''])
  t.equal(packageKey(git), git)
  t.equal(
    packageKey(
      joinDepIDTuple(['git', 'github:vercel-labs/skills', '', 'p.x']),
    ),
    git,
    'git peer fork',
  )
  const remote = joinDepIDTuple(['remote', 'https://x.y/a.tgz'])
  t.equal(packageKey(remote), baseDepID(remote))
})

t.test('readMounts', async t => {
  t.strictSame(readMounts(project(t), 'skills'), [], 'no skills dir')
  t.strictSame(
    readMounts(project(t, 'a file'), 'skills'),
    [],
    'skills is a file',
  )
  t.strictSame(
    readMounts(
      project(t, t.fixture('symlink', './outside')),
      'skills',
    ),
    [],
    'skills is a link',
  )

  const dir = project(t, {
    'README.md': 'x',
    real: {},
    out: t.fixture('symlink', '../outside/a'),
    a: t.fixture('symlink', `../${store}/skills/a`),
    bar: t.fixture('symlink', `../${scopedStore}`),
    x: t.fixture('symlink', '../outside/node_modules/.vlt/x/a'),
  })
  t.strictSame(readMounts(dir, 'skills'), [
    {
      mount: 'skills/a',
      link: resolve(dir, 'skills/a'),
      target: resolve(dir, store, 'skills/a'),
      owner: fooId,
    },
    {
      mount: 'skills/bar',
      link: resolve(dir, 'skills/bar'),
      target: resolve(dir, scopedStore),
      owner: barId,
    },
    {
      mount: 'skills/x',
      link: resolve(dir, 'skills/x'),
      target: resolve(dir, 'outside/node_modules/.vlt/x/a'),
      owner: undefined,
    },
  ])
})

t.test('mountSkill', async t => {
  t.test('links, then unchanged, then re-points', async t => {
    const dir = project(t)
    const a = skill(dir, 'foo', 'a')
    const link = resolve(dir, 'skills/a')
    t.equal(mountSkill(a, dir, 'skills'), 'linked')
    t.equal(target(link), a.path)
    if (process.platform !== 'win32') {
      t.notOk(
        isAbsolute(readlinkSync(link)),
        'relative link on posix',
      )
    }
    t.equal(mountSkill(a, dir, 'skills'), 'unchanged')
    // same mount, another store dir
    const moved = { ...a, path: resolve(dir, store, 'skills/b') }
    t.equal(mountSkill(moved, dir, 'skills'), 'linked')
    t.equal(target(link), moved.path)

    const bar = {
      ...skill(dir, '@s/bar', 'bar', scopedStore),
      path: resolve(dir, scopedStore),
    }
    t.equal(mountSkill(bar, dir, 'skills'), 'linked', 'root skill')
    t.equal(target(resolve(dir, 'skills/bar')), bar.path)
  })

  t.test('re-points a link into another store', async t => {
    const dir = project(t, {
      a: t.fixture('symlink', '../outside/node_modules/.vlt/x/a'),
    })
    const a = skill(dir, 'foo', 'a')
    t.equal(readMounts(dir, 'skills').length, 1, 'managed')
    t.equal(mountSkill(a, dir, 'skills'), 'linked')
    t.equal(target(resolve(dir, 'skills/a')), a.path)
  })

  t.test('posix dir link w/ relative target', async t => {
    t.intercept(process, 'platform', { value: 'linux' })
    const calls: [string, string, string][] = []
    const { mountSkill } = await t.mockImport<
      typeof import('../../src/skills/mounts.ts')
    >('../../src/skills/mounts.ts', {
      '../../src/reify/symlink-sync.ts': {
        symlinkSyncMkdirp: (a: string, b: string, c: string) =>
          calls.push([a, b, c]),
      },
    })
    const dir = project(t)
    const a = skill(dir, 'foo', 'a')
    const link = resolve(dir, 'skills/a')
    t.equal(mountSkill(a, dir, 'skills'), 'linked')
    t.strictSame(calls, [
      [relative(resolve(dir, 'skills'), a.path), link, 'dir'],
    ])
  })

  t.test('win32 junction w/ absolute target', async t => {
    t.intercept(process, 'platform', { value: 'win32' })
    const dir = project(t)
    const a = skill(dir, 'foo', 'a')
    t.equal(mountSkill(a, dir, 'skills'), 'linked')
    const link = resolve(dir, 'skills/a')
    t.ok(isAbsolute(readlinkSync(link)), 'absolute target')
    t.equal(target(link), a.path)
  })

  t.test('conflicts', async t => {
    const cases: [string, Dir][] = [
      ['skills is a file', 'x'],
      ['skills is a link', t.fixture('symlink', './outside')],
      ['mount is a real dir', { a: {} }],
      [
        'mount is a link outside the store',
        { a: t.fixture('symlink', '../outside/a') },
      ],
    ]
    for (const [name, skills] of cases) {
      const dir = project(t, skills)
      t.equal(
        mountSkill(skill(dir, 'foo', 'a'), dir, 'skills'),
        'conflict',
        name,
      )
    }
  })
})

t.test('unmountSkill', async t => {
  t.test('last link: ./skills removed', async t => {
    const dir = project(t)
    const a = skill(dir, 'foo', 'a')
    mountSkill(a, dir, 'skills')
    const [m] = readMounts(dir, 'skills')
    if (!m) throw new Error('no mount')
    unmountSkill(m, dir, 'skills')
    t.notOk(existsSync(resolve(dir, 'skills')), 'skills removed')
    t.ok(existsSync(a.path), 'target kept')
  })

  t.test('keeps a non-empty ./skills', async t => {
    const dir = project(t, { 'README.md': 'x' })
    mountSkill(skill(dir, 'foo', 'a'), dir, 'skills')
    mountSkill(skill(dir, 'foo', 'b'), dir, 'skills')
    const [a] = readMounts(dir, 'skills')
    if (!a) throw new Error('no mount')
    unmountSkill(a, dir, 'skills')
    t.notOk(lstatSync(a.link, { throwIfNoEntry: false }))
    t.ok(lstatSync(resolve(dir, 'skills/b')).isSymbolicLink())
    t.ok(existsSync(resolve(dir, 'skills/README.md')), 'skills kept')
  })

  t.test('ignores rmdir errors', async t => {
    const dir = project(t)
    const link = resolve(dir, 'skills/a')
    mountSkill(skill(dir, 'foo', 'a'), dir, 'skills')
    const { unmountSkill } = await t.mockImport<
      typeof import('../../src/skills/mounts.ts')
    >('../../src/skills/mounts.ts', {
      'node:fs': {
        ...fs,
        rmdirSync: () => {
          throw Object.assign(new Error('nope'), { code: 'EPERM' })
        },
      },
    })
    unmountSkill(
      { mount: 'skills/a', link, target: '' },
      dir,
      'skills',
    )
    t.notOk(lstatSync(link, { throwIfNoEntry: false }), 'link gone')
    t.ok(existsSync(resolve(dir, 'skills')), 'busy dir kept')
  })
})
