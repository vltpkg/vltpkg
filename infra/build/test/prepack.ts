import t from 'tap'
import type { Test } from 'tap'
import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import * as Bundle from '../src/bundle.ts'
import * as Compile from '../src/compile.ts'

const mockCli = async (
  t: Test,
  {
    argv = [],
    pkg,
  }: {
    argv?: string[]
    pkg?: Record<string, string | object>
  },
) => {
  const dir = t.testdir({
    'package.json': JSON.stringify({
      version: '1.2.3',
      description: 'hi',
      repository: 'my-repo',
      keywords: ['hi'],
      type: 'module',
      license: 'MIT',
      scripts: { dont_copy_this: 'hi' },
      devDependencies: { dont_copy_this: 'hi' },
      ...pkg,
    }),
    'README.md': 'hi',
    LICENSE: 'hi',
    'postinstall.cjs': 'hi',
    'placeholder-bin.js': 'hi',
  })

  t.chdir(dir)
  t.intercept(process, 'argv', {
    value: [
      process.execPath,
      resolve(import.meta.dirname, '../src/prepack.ts'),
      ...argv,
    ],
  })

  const calls = { bundle: 0, compile: 0 }

  await t.mockImport<typeof import('../src/prepack.ts')>(
    '../src/prepack.ts',
    {
      '../src/bundle.ts': t.createMock(Bundle, {
        bundle: async (o: unknown) => {
          calls.bundle++
          return o
        },
      }),
      '../src/compile.ts': t.createMock(Compile, {
        compile: async (o: unknown) => {
          calls.compile++
          return o
        },
      }),
    },
  )

  return {
    dir,
    calls,
    readOutdir: (p: string) => readdirSync(join(dir, p)).sort(),
    readPkg: (p: string) =>
      JSON.parse(readFileSync(join(dir, p, 'package.json'), 'utf8')),
  }
}

t.test('invalid name', async t => {
  await t.rejects(
    mockCli(t, {
      pkg: { name: 'bad-name', publishConfig: { directory: 'ok' } },
    }),
  )
})

t.test('default vlt CLI', async t => {
  const dir = 'outdir'
  const { readPkg, readOutdir } = await mockCli(t, {
    pkg: {
      name: 'vlt',
      publishConfig: {
        directory: dir,
      },
    },
  })
  t.strictSame(readPkg(dir), {
    name: 'vlt',
    version: '1.2.3',
    description: 'hi',
    repository: 'my-repo',
    keywords: ['hi'],
    type: 'module',
    license: 'MIT',
  })
  t.strictSame(
    readOutdir(dir),
    ['LICENSE', 'README.md', 'package.json'].sort(),
  )
})

t.test('root compiled bin', async t => {
  const dir = 'outdir'
  const mockRootBin = (t: Test) =>
    mockCli(t, {
      pkg: {
        name: '@vltpkg/cli-compiled',
        publishConfig: {
          directory: dir,
        },
      },
    })

  t.test('override optional deps', async t => {
    t.intercept(process, 'env', {
      value: {
        ...process.env,
        __VLT_INTERNAL_LOCAL_OPTIONAL_DEPS: '1',
      },
    })
    const { readOutdir, readPkg } = await mockRootBin(t)
    t.strictSame(readPkg(dir), {
      name: '@vltpkg/cli-compiled',
      version: '1.2.3',
      description: 'hi',
      repository: 'my-repo',
      keywords: ['hi'],
      type: 'module',
      license: 'MIT',
      bin: {
        vlt: './vlt',
      },
      optionalDependencies: {
        '@vltpkg/cli-linux-x64':
          'file:./vltpkg-cli-linux-x64-1.2.3.tgz',
        '@vltpkg/cli-linux-arm64':
          'file:./vltpkg-cli-linux-arm64-1.2.3.tgz',
        '@vltpkg/cli-darwin-x64':
          'file:./vltpkg-cli-darwin-x64-1.2.3.tgz',
        '@vltpkg/cli-darwin-arm64':
          'file:./vltpkg-cli-darwin-arm64-1.2.3.tgz',
        '@vltpkg/cli-win32-x64':
          'file:./vltpkg-cli-win32-x64-1.2.3.tgz',
      },
      scripts: {
        postinstall: 'node postinstall.cjs',
      },
    })
    t.strictSame(
      readOutdir(dir),
      [
        'LICENSE',
        'README.md',
        'package.json',
        'vlt',
        'postinstall.cjs',
      ].sort(),
    )
  })

  t.test('publish', async t => {
    const { readOutdir, readPkg } = await mockRootBin(t)
    t.strictSame(readPkg(dir), {
      name: '@vltpkg/cli-compiled',
      version: '1.2.3',
      description: 'hi',
      repository: 'my-repo',
      keywords: ['hi'],
      type: 'module',
      license: 'MIT',
      bin: {
        vlt: './vlt',
      },
      optionalDependencies: {
        '@vltpkg/cli-linux-x64': '1.2.3',
        '@vltpkg/cli-linux-arm64': '1.2.3',
        '@vltpkg/cli-darwin-x64': '1.2.3',
        '@vltpkg/cli-darwin-arm64': '1.2.3',
        '@vltpkg/cli-win32-x64': '1.2.3',
      },
      scripts: {
        postinstall: 'node postinstall.cjs',
      },
    })
    t.strictSame(
      readOutdir(dir),
      [
        'LICENSE',
        'README.md',
        'package.json',
        'vlt',
        'postinstall.cjs',
      ].sort(),
    )
  })
})

t.test('platform bin', async t => {
  const dir = 'outdir'
  const mockPlatformBin = (t: Test) =>
    mockCli(t, {
      pkg: {
        name: '@vltpkg/cli-darwin-x64',
        publishConfig: {
          directory: dir,
        },
      },
    })

  t.test('publish', async t => {
    const { readOutdir, readPkg } = await mockPlatformBin(t)
    t.strictSame(readPkg(dir), {
      name: '@vltpkg/cli-darwin-x64',
      version: '1.2.3',
      description: 'hi',
      repository: 'my-repo',
      keywords: ['hi'],
      type: 'module',
      license: 'MIT',
      os: ['darwin'],
      cpu: ['x64'],
    })
    t.strictSame(
      readOutdir(dir),
      ['LICENSE', 'README.md', 'package.json'].sort(),
    )
  })
})
