import { joinDepIDTuple } from '@vltpkg/dep-id'
import * as fs from 'node:fs'
import { existsSync, lstatSync, readlinkSync } from 'node:fs'
import { dirname, isAbsolute, relative, resolve } from 'node:path'
import t from 'tap'
import type { Test } from 'tap'
import type { Skill } from '../../src/skills/discover.ts'
import {
  mountPath,
  mountSkill,
  mountTarget,
  readMounts,
  samePath,
  unmountSkill,
} from '../../src/skills/mounts.ts'

const store = 'node_modules/.vlt/~npm~foo@1.0.0/node_modules/foo'
const scopedStore =
  'node_modules/.vlt/~npm~@s+bar@1.0.0/node_modules/@s/bar'

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
  mount: `skills/${name}/${s}`,
  linked: false,
})

const target = (link: string) =>
  resolve(dirname(link), readlinkSync(link))

t.test('samePath + mountPath', async t => {
  t.ok(samePath('/a/b/../c', '/a/c'))
  t.notOk(samePath('/a/b', '/a/c'))
  t.equal(
    mountPath('/p', 'skills/@s/bar/x'),
    resolve('/p/skills/@s/bar/x'),
  )
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
    foo: {
      real: {},
      out: t.fixture('symlink', '../../outside/a'),
      in: t.fixture('symlink', `../../${store}/skills/a`),
      gone: t.fixture('symlink', `../../${store}/skills/gone`),
      moved: t.fixture(
        'symlink',
        '../../outside/node_modules/.vlt/x/a',
      ),
      upper: t.fixture('symlink', '../../NODE_MODULES/.VLT/x/a'),
    },
  })
  const link = (n: string) => resolve(dir, 'skills/foo', n)
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

t.test('readMounts', async t => {
  t.strictSame(readMounts(project(t)), [], 'no skills dir')
  t.strictSame(
    readMounts(project(t, 'a file')),
    [],
    'skills is a file',
  )

  const dir = project(t, {
    'README.md': 'x',
    linked: t.fixture('symlink', '../outside'),
    foo: {
      a: t.fixture('symlink', `../../${store}/skills/a`),
      out: t.fixture('symlink', '../../outside/a'),
      file: 'x',
      real: {},
    },
    '@s': {
      'file.md': 'x',
      bar: {
        c: t.fixture('symlink', `../../../${scopedStore}/skills/c`),
      },
    },
    // a user skill dir: never ours, even with a store link inside
    mine: {
      'SKILL.md': '',
      a: t.fixture('symlink', `../../${store}/skills/a`),
    },
  })
  t.strictSame(readMounts(dir), [
    {
      mount: 'skills/@s/bar/c',
      link: resolve(dir, 'skills/@s/bar/c'),
      name: '@s/bar',
      target: resolve(dir, scopedStore, 'skills/c'),
    },
    {
      mount: 'skills/foo/a',
      link: resolve(dir, 'skills/foo/a'),
      name: 'foo',
      target: resolve(dir, store, 'skills/a'),
    },
  ])
})

t.test('mountSkill', async t => {
  t.test('links, then unchanged, then re-points', async t => {
    const dir = project(t)
    const a = skill(dir, 'foo', 'a')
    const link = resolve(dir, 'skills/foo/a')
    t.equal(mountSkill(a, dir), 'linked')
    t.equal(target(link), a.path)
    if (process.platform !== 'win32') {
      t.notOk(
        isAbsolute(readlinkSync(link)),
        'relative link on posix',
      )
    }
    t.equal(mountSkill(a, dir), 'unchanged')
    // same mount, another store dir
    const moved = { ...a, path: resolve(dir, store, 'skills/b') }
    t.equal(mountSkill(moved, dir), 'linked')
    t.equal(target(link), moved.path)

    const c = skill(dir, '@s/bar', 'c', scopedStore)
    t.equal(mountSkill(c, dir), 'linked')
    t.equal(target(resolve(dir, 'skills/@s/bar/c')), c.path)
  })

  t.test('re-points a link into another store', async t => {
    const dir = project(t, {
      foo: {
        a: t.fixture(
          'symlink',
          '../../outside/node_modules/.vlt/x/a',
        ),
      },
    })
    const a = skill(dir, 'foo', 'a')
    t.equal(readMounts(dir).length, 1, 'managed')
    t.equal(mountSkill(a, dir), 'linked')
    t.equal(target(resolve(dir, 'skills/foo/a')), a.path)
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
    const link = resolve(dir, 'skills/foo/a')
    t.equal(mountSkill(a, dir), 'linked')
    t.strictSame(calls, [
      [relative(dirname(link), a.path), link, 'dir'],
    ])
  })

  t.test('win32 junction w/ absolute target', async t => {
    t.intercept(process, 'platform', { value: 'win32' })
    const dir = project(t)
    const a = skill(dir, 'foo', 'a')
    t.equal(mountSkill(a, dir), 'linked')
    const link = resolve(dir, 'skills/foo/a')
    t.ok(isAbsolute(readlinkSync(link)), 'absolute target')
    t.equal(target(link), a.path)
  })

  t.test('conflicts', async t => {
    const cases: [string, Dir][] = [
      ['skills is a file', 'x'],
      ['skills is a link', t.fixture('symlink', './outside')],
      ['container is a file', { foo: 'x' }],
      ['container has SKILL.md', { foo: { 'SKILL.md': '' } }],
      ['mount is a real dir', { foo: { a: {} } }],
      [
        'mount is a link outside the store',
        { foo: { a: t.fixture('symlink', '../../outside/a') } },
      ],
    ]
    for (const [name, skills] of cases) {
      const dir = project(t, skills)
      t.equal(
        mountSkill(skill(dir, 'foo', 'a'), dir),
        'conflict',
        name,
      )
    }
    const dir = project(t, { '@s': 'x' })
    t.equal(
      mountSkill(skill(dir, '@s/bar', 'c', scopedStore), dir),
      'conflict',
      'scope dir is a file',
    )
  })
})

t.test('unmountSkill', async t => {
  t.test('removes the link and empty parents', async t => {
    const dir = project(t)
    const c = skill(dir, '@s/bar', 'c', scopedStore)
    mountSkill(c, dir)
    const [m] = readMounts(dir)
    if (!m) throw new Error('no mount')
    unmountSkill(m, dir)
    t.notOk(existsSync(resolve(dir, 'skills')), 'skills removed')
    t.ok(existsSync(c.path), 'target kept')
  })

  t.test('keeps non-empty parents', async t => {
    const dir = project(t, { 'README.md': 'x' })
    mountSkill(skill(dir, 'foo', 'a'), dir)
    mountSkill(skill(dir, 'foo', 'b'), dir)
    const [a] = readMounts(dir)
    if (!a) throw new Error('no mount')
    unmountSkill(a, dir)
    t.notOk(lstatSync(a.link, { throwIfNoEntry: false }))
    t.ok(lstatSync(resolve(dir, 'skills/foo/b')).isSymbolicLink())
    unmountSkill(
      {
        mount: 'skills/foo/b',
        link: resolve(dir, 'skills/foo/b'),
        name: 'foo',
        target: '',
      },
      dir,
    )
    t.notOk(
      existsSync(resolve(dir, 'skills/foo')),
      'empty container gone',
    )
    t.ok(existsSync(resolve(dir, 'skills/README.md')), 'skills kept')
  })

  t.test('ignores rmdir errors', async t => {
    const dir = project(t)
    const link = resolve(dir, 'skills/foo/a')
    mountSkill(skill(dir, 'foo', 'a'), dir)
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
      { mount: 'skills/foo/a', link, name: 'foo', target: '' },
      dir,
    )
    t.notOk(lstatSync(link, { throwIfNoEntry: false }), 'link gone')
    t.ok(existsSync(resolve(dir, 'skills/foo')), 'busy dir kept')
  })
})
