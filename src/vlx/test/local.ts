import { findCmdShim } from '@vltpkg/cmd-shim'
import { PackageJson } from '@vltpkg/package-json'
import { Spec } from '@vltpkg/spec'
import {
  existsSync,
  readdirSync,
  realpathSync,
  writeFileSync,
} from 'node:fs'
import * as fsp from 'node:fs/promises'
import { basename, dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { Test } from 'tap'
import t from 'tap'

const getLocal = (t: Test, mocks: Record<string, unknown> = {}) =>
  t.mockImport<typeof import('../src/local.ts')>('../src/local.ts', {
    '@vltpkg/xdg': {
      XDG: class {
        cache(p = '') {
          return resolve(t.testdirName, 'cache', p)
        }
      },
    },
    ...mocks,
  })

const bin = '#!/usr/bin/env node\n'

const fixture = (t: Test) => {
  const root = t.testdir({
    pkg: {
      'package.json': JSON.stringify({
        name: 'a',
        version: '1.2.3',
        bin: { a: 'a.js', b: 'b.js' },
      }),
      'a.js': bin,
      'a2.js': bin,
      'b.js': bin,
    },
  })
  return resolve(root, 'pkg')
}

const shimTarget = async (path: string, name: string) =>
  (await findCmdShim(resolve(path, 'node_modules/.bin', name)))[1]

const isShimDir = (p: string) => /^[0-9a-f]{16}$/.test(basename(p))

// shim dirs only, no leftover tmp dirs
const cacheEntries = (t: Test) =>
  readdirSync(resolve(t.testdirName, 'cache'))

t.test('localDir', async t => {
  const { localDir } = await getLocal(t)
  const dir = t.testdir({
    pkg: { 'package.json': '{}' },
    'x.tgz': '',
  })
  t.chdir(dir)
  const pkg = resolve(dir, 'pkg')
  t.equal(await localDir(Spec.parseArgs('./pkg')), pkg)
  t.equal(await localDir(Spec.parseArgs('file:pkg')), pkg)
  t.equal(
    await localDir(Spec.parseArgs(String(pathToFileURL(pkg)))),
    pkg,
  )
  t.equal(await localDir(Spec.parseArgs('./')), resolve(dir))
  t.equal(await localDir(Spec.parseArgs('./x.tgz')), undefined)
  t.equal(await localDir(Spec.parseArgs('./nope')), undefined)
  t.equal(await localDir(Spec.parseArgs('foo@1')), undefined)
})

t.test('vlxLocal', async t => {
  const { vlxLocal } = await getLocal(t)
  const dir = fixture(t)
  const info = await vlxLocal(dir, new PackageJson())
  const { path } = info
  t.strictSame(info, {
    path,
    name: 'a',
    version: '1.2.3',
    resolved: String(pathToFileURL(dir)),
    arg0: 'a',
  })
  t.equal(
    dirname(path),
    realpathSync.native(resolve(t.testdirName, 'cache')),
  )
  t.ok(isShimDir(path))
  t.equal(await shimTarget(path, 'a'), resolve(dir, 'a.js'))
  t.equal(await shimTarget(path, 'b'), resolve(dir, 'b.js'))

  t.test('unchanged: reused as is', async t => {
    writeFileSync(resolve(path, 'marker'), '')
    t.equal((await vlxLocal(dir, new PackageJson())).path, path)
    t.equal(existsSync(resolve(path, 'marker')), true)
  })

  t.test('bins changed: new dir, old one kept', async t => {
    writeFileSync(
      resolve(dir, 'package.json'),
      JSON.stringify({ name: 'a', bin: { a: 'a2.js' } }),
    )
    const p = (await vlxLocal(dir, new PackageJson())).path
    t.not(p, path)
    t.equal(await shimTarget(p, 'a'), resolve(dir, 'a2.js'))
    t.equal(existsSync(resolve(p, 'node_modules/.bin/b')), false)
    t.equal(await shimTarget(path, 'b'), resolve(dir, 'b.js'))
  })

  t.test('shebang changed: new dir', async t => {
    const before = (await vlxLocal(dir, new PackageJson())).path
    writeFileSync(resolve(dir, 'a2.js'), '#!/bin/sh\n')
    const p = (await vlxLocal(dir, new PackageJson())).path
    t.not(p, before)
  })
})

t.test('concurrent runs', async t => {
  const { vlxLocal } = await getLocal(t)
  const dir = fixture(t)
  const [x, y] = await Promise.all([
    vlxLocal(dir, new PackageJson()),
    vlxLocal(dir, new PackageJson()),
  ])
  t.equal(x.path, y.path)
  t.equal(await shimTarget(x.path, 'a'), resolve(dir, 'a.js'))
  t.equal(await shimTarget(x.path, 'b'), resolve(dir, 'b.js'))
  t.strictSame(cacheEntries(t), [basename(x.path)])
})

t.test('another run made it first', async t => {
  const { vlxLocal } = await getLocal(t, {
    'node:fs/promises': {
      ...fsp,
      rename: async (from: string, to: string) => {
        if (isShimDir(to)) await fsp.cp(from, to, { recursive: true })
        return fsp.rename(from, to)
      },
    },
  })
  const dir = fixture(t)
  const { path } = await vlxLocal(dir, new PackageJson())
  t.equal(await shimTarget(path, 'a'), resolve(dir, 'a.js'))
  t.strictSame(cacheEntries(t), [basename(path)])
})

t.test('rename fails', async t => {
  const { vlxLocal } = await getLocal(t, {
    'node:fs/promises': {
      ...fsp,
      rename: async (from: string, to: string) => {
        if (isShimDir(to)) throw new Error('nope')
        return fsp.rename(from, to)
      },
    },
  })
  await t.rejects(vlxLocal(fixture(t), new PackageJson()), {
    message: 'nope',
  })
})

t.test('symlinked cache dir', async t => {
  const { vlxLocal } = await getLocal(t)
  const root = t.testdir({
    real: {},
    cache: t.fixture('symlink', 'real'),
    'package.json': JSON.stringify({ name: 'x', bin: 'x.js' }),
    'x.js': bin,
  })
  const { path } = await vlxLocal(root, new PackageJson())
  t.equal(dirname(path), realpathSync.native(resolve(root, 'real')))
  t.equal(await shimTarget(path, 'x'), resolve(root, 'x.js'))
})

t.test('no bin', async t => {
  const { vlxLocal } = await getLocal(t)
  const dir = t.testdir({
    'package.json': JSON.stringify({ name: 'nobin' }),
  })
  t.match(await vlxLocal(dir, new PackageJson()), {
    name: 'nobin',
    arg0: undefined,
  })
})

t.test('no name', async t => {
  const { vlxLocal } = await getLocal(t)
  const dir = t.testdir({
    'package.json': JSON.stringify({ bin: { x: 'x.js' } }),
    'x.js': bin,
  })
  t.match(await vlxLocal(dir, new PackageJson()), {
    name: basename(dir),
    arg0: undefined,
  })
})

t.test('missing bin target', async t => {
  const { vlxLocal } = await getLocal(t)
  const dir = t.testdir({
    'package.json': JSON.stringify({
      name: 'x',
      bin: { x: 'dist/x.js' },
    }),
  })
  await t.rejects(vlxLocal(dir, new PackageJson()), {
    message: 'Bin target not found: x -> dist/x.js',
    cause: { path: resolve(dir, 'dist/x.js') },
  })
})

t.test('no package.json', async t => {
  const { vlxLocal } = await getLocal(t)
  const dir = t.testdir({})
  await t.rejects(vlxLocal(dir, new PackageJson()), {
    message: 'Could not read package.json file',
  })
})
