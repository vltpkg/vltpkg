import t from 'tap'
import type { Test } from 'tap'
import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import * as Bundle from '../src/bundle.ts'
import * as Compile from '../src/compile.ts'

const mockCli = async (
  t: Test,
  {
    workspaceName,
    argv = [],
    pkg,
  }: {
    workspaceName: string
    argv?: string[]
    pkg?: Record<string, string | object>
  },
) => {
  const testdir = t.testdir({
    [workspaceName]: {
      'package.json': JSON.stringify({
        name: 'my-published-package',
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
    },
  })
  const dir = join(testdir, workspaceName)

  t.chdir(dir)
  t.intercept(process, 'argv', {
    value: [
      process.execPath,
      resolve(import.meta.dirname, '../src/prepack.ts'),
      ...argv,
    ],
  })

  const calls: {
    bundle: Bundle.Options[]
    compile: Compile.Options[]
  } = {
    bundle: [],
    compile: [],
  }

  await t.mockImport<typeof import('../src/prepack.ts')>(
    '../src/prepack.ts',
    {
      '../src/bundle.ts': t.createMock(Bundle, {
        bundle: async (o: Bundle.Options) => {
          calls.bundle.push(o)
          return o
        },
      }),
      '../src/compile.ts': t.createMock(Compile, {
        compile: async (o: Compile.Options) => {
          calls.compile.push(o)
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
      workspaceName: 'bad-name',
      pkg: { publishConfig: { directory: 'ok' } },
    }),
  )
})

t.test('bundled CLI', async t => {
  const dir = 'outdir'
  const { readPkg, readOutdir } = await mockCli(t, {
    workspaceName: 'cli-js',
    pkg: {
      publishConfig: {
        directory: dir,
      },
    },
  })
  t.strictSame(readPkg(dir), {
    name: 'my-published-package',
    version: '1.2.3',
    description: 'hi',
    repository: 'my-repo',
    keywords: ['hi'],
    type: 'module',
    license: 'MIT',
    bin: {
      vlix: './vlix.js',
      vlr: './vlr.js',
      vlrx: './vlrx.js',
      vlt: './vlt.js',
      vlx: './vlx.js',
    },
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
      workspaceName: 'cli-compiled',
      pkg: {
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
      name: 'my-published-package',
      version: '1.2.3',
      description: 'hi',
      repository: 'my-repo',
      keywords: ['hi'],
      type: 'module',
      license: 'MIT',
      bin: {
        vlix: './vlix',
        vlr: './vlr',
        vlrx: './vlrx',
        vlt: './vlt',
        vlx: './vlx',
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
        'vlix',
        'vlr',
        'vlrx',
        'vlt',
        'vlx',
        'postinstall.cjs',
      ].sort(),
    )
  })

  t.test('limit which bins to create', async t => {
    t.intercept(process, 'env', {
      value: {
        ...process.env,
        __VLT_INTERNAL_COMPILED_BINS: 'vlt,vlr',
      },
    })
    const { readOutdir, readPkg } = await mockRootBin(t)
    t.strictSame(readPkg(dir), {
      name: 'my-published-package',
      version: '1.2.3',
      description: 'hi',
      repository: 'my-repo',
      keywords: ['hi'],
      type: 'module',
      license: 'MIT',
      bin: {
        vlr: './vlr',
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
        'vlr',
        'vlt',
        'postinstall.cjs',
      ].sort(),
    )
  })

  t.test('publish', async t => {
    const { readOutdir, readPkg } = await mockRootBin(t)
    t.strictSame(readPkg(dir), {
      name: 'my-published-package',
      version: '1.2.3',
      description: 'hi',
      repository: 'my-repo',
      keywords: ['hi'],
      type: 'module',
      license: 'MIT',
      bin: {
        vlix: './vlix',
        vlr: './vlr',
        vlrx: './vlrx',
        vlt: './vlt',
        vlx: './vlx',
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
        'vlix',
        'vlr',
        'vlrx',
        'vlt',
        'vlx',
        'postinstall.cjs',
      ].sort(),
    )
  })
})

t.test('platform bin', async t => {
  const dir = 'outdir'
  const mockPlatformBin = (t: Test) =>
    mockCli(t, {
      workspaceName: 'cli-darwin-x64',
      pkg: {
        name: '@vltpkg/cli-darwin-x64',
        publishConfig: {
          directory: dir,
        },
      },
    })

  t.test('limit which bins to create', async t => {
    t.intercept(process, 'env', {
      value: {
        ...process.env,
        __VLT_INTERNAL_COMPILED_BINS: 'vlt,vlr',
      },
    })
    const { readOutdir, readPkg, calls } = await mockPlatformBin(t)
    t.strictSame(calls.compile[0]?.bins, ['vlt', 'vlr'])
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

  t.test('publish', async t => {
    const { readOutdir, readPkg, calls } = await mockPlatformBin(t)
    t.strictSame(calls.compile[0]?.bins, [
      'vlix',
      'vlr',
      'vlrx',
      'vlt',
      'vlx',
    ])
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
