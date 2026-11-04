import { error } from '@vltpkg/error-cause'
import { PackageJson } from '@vltpkg/package-json'
import { Spec } from '@vltpkg/spec'
import { utimes } from 'node:fs/promises'
import { resolve } from 'node:path'
import t from 'tap'
import type { VlxOptions } from '../src/index.ts'

const { lastInstall, unreachable } = await t.mockImport<
  typeof import('../src/last-install.ts')
>('../src/last-install.ts', {
  '../src/mount-path.ts': {
    mountPath: (_: string, path: string) => path,
  },
})

t.test('unreachable', t => {
  const request = error('Request failed', { code: 'EREQUEST' })
  t.equal(unreachable(request), true, 'the registry client error')
  t.equal(
    unreachable(error('could not resolve', { cause: request })),
    true,
    'wrapped',
  )
  t.equal(
    unreachable(error('not found', { code: 'ERESOLVE' })),
    false,
    'the host answered',
  )
  t.equal(unreachable(new Error('no cause')), false)
  t.equal(unreachable('nope'), false)
  t.equal(unreachable(undefined), false)
  t.end()
})

t.test('lastInstall', async t => {
  const spec = Spec.parseArgs('x@github:o/r#main')
  const key = String(spec)
  const install = (
    spec: string | undefined,
    version: string,
    extra: Record<string, string> = {},
  ) => ({
    'package.json': JSON.stringify({
      name: 'vlx',
      dependencies: { x: `https://example.com/${version}` },
      ...(spec ? { vlx: { spec } } : {}),
    }),
    node_modules: {
      x: {
        'package.json': JSON.stringify({
          name: 'x',
          version,
          bin: 'x.js',
        }),
        ...extra,
      },
    },
  })
  const dir = t.testdir({
    'x-older': install(key, '1.0.0'),
    'x-newer': install(key, '2.0.0'),
    'x-broken': install(key, '3.0.0'),
    'x-other': install('x@github:o/r#dev', '4.0.0'),
    'x-legacy': install(undefined, '5.0.0'),
    'x-nopj': {},
    'y-newest': install(key, '6.0.0'),
  })
  // newest install first, a broken one passed over
  const at = async (name: string, t: number) =>
    utimes(resolve(dir, name, 'package.json'), t, t)
  await at('x-older', 1000)
  await at('x-broken', 3000)
  await at('x-newer', 2000)
  const options = {
    packageJson: new PackageJson(),
  } as unknown as VlxOptions
  const { vlxInfo } = await import('../src/info.ts')
  void vlxInfo

  const mocked = await t.mockImport<
    typeof import('../src/last-install.ts')
  >('../src/last-install.ts', {
    '../src/info.ts': {
      vlxInfo: (path: string) => {
        if (path.endsWith('x-broken')) throw new Error('broken')
        return { path, name: 'x', resolved: 'r' }
      },
    },
  })
  t.match(
    await mocked.lastInstall(spec, dir, options),
    { path: resolve(dir, 'x-newer') },
    'the newest of the spec that can be read',
  )
  t.equal(
    await mocked.lastInstall(
      Spec.parseArgs('x@github:o/r#gone'),
      dir,
      options,
    ),
    undefined,
    'never installed',
  )
  t.equal(
    await mocked.lastInstall(spec, resolve(dir, 'nowhere'), options),
    undefined,
    'no installs at all',
  )

  // the real info of a dir
  t.match(await lastInstall(spec, dir, options), {
    path: resolve(dir, 'x-broken'),
    name: 'x',
    version: '3.0.0',
    resolved: 'https://example.com/3.0.0',
    arg0: 'x',
    spec: key,
  })
})
