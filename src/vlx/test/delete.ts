import { PackageJson } from '@vltpkg/package-json'
import type { RollbackRemove } from '@vltpkg/rollback-remove'
import { readdirSync } from 'node:fs'
import { opendir, rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import t from 'tap'
import type { VlxManifest, VlxOptions } from '../src/index.ts'

const mockVlxInfo = await t.mockImport<
  typeof import('../src/info.ts')
>('../src/info.ts', {
  '../src/mount-path.ts': {
    mountPath: (_: string, path: string) => path,
  },
})

const remover = {
  rm: (path: string) => rm(path, { recursive: true, force: true }),
} as unknown as RollbackRemove

const options = {
  packageJson: new PackageJson(),
} as unknown as VlxOptions

const rootDepManifest: VlxManifest = {
  name: 'vlx',
  dependencies: {
    dep: 'https://registry.npmjs.org/dep/-/dep-1.2.3.tgz',
  },
  vlx: {},
  [Symbol.for('indent')]: '',
  [Symbol.for('newline')]: '',
}

const rootNobinManifest: VlxManifest = {
  name: 'vlx',
  dependencies: {
    nobin: 'https://registry.npmjs.org/nobin/-/nobin-1.2.3.tgz',
  },
  vlx: {},
  [Symbol.for('indent')]: '',
  [Symbol.for('newline')]: '',
}

const fixture = {
  hashdep: {
    'package.json': JSON.stringify(rootDepManifest),
    node_modules: {
      dep: {
        'package.json': JSON.stringify({
          name: 'dep',
          version: '1.2.3',
          bin: 'dep.js',
        }),
      },
    },
  },
  hashnobin: {
    'package.json': JSON.stringify(rootNobinManifest),
    node_modules: {
      nobin: {
        'package.json': JSON.stringify({
          name: 'nobin',
          version: '1.2.3',
        }),
      },
    },
  },
  hashbroken: {
    'package.json': JSON.stringify({}),
  },
}

const mockVlxList = (path: string) =>
  async function* () {
    const dir = await opendir(path)
    for await (const dirent of dir) {
      yield resolve(path, dirent.name)
    }
  }

t.test('delete everything', async t => {
  const dir = t.testdir(fixture)
  const { vlxDelete } = await t.mockImport<
    typeof import('../src/delete.ts')
  >('../src/delete.ts', {
    '../src/list.ts': { vlxList: mockVlxList(dir) },
    '../src/info.ts': mockVlxInfo,
  })
  const results = await vlxDelete([], remover, options)
  t.match(
    new Set(results),
    new Set(['hashdep', 'hashbroken', 'hashnobin']),
  )
  t.strictSame(readdirSync(dir), [])
})

t.test('delete by key', async t => {
  const dir = t.testdir(fixture)
  const { vlxDelete } = await t.mockImport<
    typeof import('../src/delete.ts')
  >('../src/delete.ts', {
    '../src/list.ts': { vlxList: mockVlxList(dir) },
    '../src/info.ts': mockVlxInfo,
  })
  const results = await vlxDelete(['hashnobin'], remover, options)
  t.matchOnly(new Set(results), new Set(['hashnobin', 'hashbroken']))
  t.strictSame(readdirSync(dir), ['hashdep'])
})

t.test('missing key, still deletes bad entry', async t => {
  const k = 'nokeyfoundhereoops'
  const dir = t.testdir(fixture)
  const { vlxDelete } = await t.mockImport<
    typeof import('../src/delete.ts')
  >('../src/delete.ts', {
    '../src/list.ts': { vlxList: mockVlxList(dir) },
    '../src/info.ts': mockVlxInfo,
  })
  const results = await vlxDelete([k], remover, options)
  t.match(results, [])
  t.strictSame(
    new Set(readdirSync(dir)),
    new Set(['hashdep', 'hashnobin']),
  )
})
