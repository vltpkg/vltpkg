import { PackageJson } from '@vltpkg/package-json'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import t from 'tap'
import { findPackage } from '../src/find-package.ts'

const packageJson = new PackageJson()

t.test('directly in the project, no pj', async t => {
  const dir = t.testdir({
    node_modules: {
      foo: {
        'package.json': JSON.stringify({
          name: 'foo',
          version: '1.2.3',
          bin: 'foo.js',
        }),
      },
      nobin: {
        'package.json': JSON.stringify({
          name: 'nobin',
          version: '1.2.3',
        }),
      },
    },
  })
  t.chdir(dir)
  t.strictSame(await findPackage('nobin', dir, packageJson), {
    path: resolve(dir),
    name: 'nobin',
    version: '1.2.3',
    resolved: String(
      pathToFileURL(resolve(dir, 'node_modules/nobin')),
    ),
    arg0: undefined,
  })
  t.equal(await findPackage('nodep', dir, packageJson), undefined)
  t.strictSame(await findPackage('foo', dir, packageJson), {
    path: resolve(dir),
    name: 'foo',
    version: '1.2.3',
    resolved: String(pathToFileURL(resolve(dir, 'node_modules/foo'))),
    arg0: 'foo',
  })
})

t.test('in workspace with pj', async t => {
  const wsManifest = {
    name: 'ws',
    version: '1.2.3',
    [Symbol.for('indent')]: '',
    [Symbol.for('newline')]: '',
  }

  const rootManifest = {
    name: 'root',
    version: '2.3.4',
    [Symbol.for('indent')]: '',
    [Symbol.for('newline')]: '',
  }

  const dir = t.testdir({
    'package.json': JSON.stringify(rootManifest),
    node_modules: {
      rootdep: {
        'package.json': JSON.stringify({
          name: 'rootdep',
          version: '1.2.3',
          bin: 'rootdep.js',
        }),
      },
    },
    packages: {
      ws: {
        'package.json': JSON.stringify(wsManifest),
        node_modules: {
          foo: {
            'package.json': JSON.stringify({
              name: 'foo',
              version: '1.2.3',
              bin: 'foo.js',
            }),
          },
          nobin: {
            'package.json': JSON.stringify({
              name: 'nobin',
              version: '1.2.3',
            }),
          },
        },
      },
    },
  })

  const wsdir = resolve(dir, 'packages/ws')
  t.chdir(wsdir)
  t.strictSame(await findPackage('nobin', dir, packageJson), {
    path: resolve(wsdir),
    name: 'nobin',
    version: '1.2.3',
    resolved: String(
      pathToFileURL(resolve(wsdir, 'node_modules/nobin')),
    ),
    arg0: undefined,
  })
  t.equal(await findPackage('nodep', dir, packageJson), undefined)
  t.strictSame(await findPackage('foo', dir, packageJson), {
    path: resolve(wsdir),
    name: 'foo',
    version: '1.2.3',
    resolved: String(
      pathToFileURL(resolve(wsdir, 'node_modules/foo')),
    ),
    arg0: 'foo',
  })
  t.strictSame(await findPackage('rootdep', dir, packageJson), {
    path: resolve(dir),
    name: 'rootdep',
    version: '1.2.3',
    resolved: String(
      pathToFileURL(resolve(dir, 'node_modules/rootdep')),
    ),
    arg0: 'rootdep',
  })
})
