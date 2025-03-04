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
      name: 'my-pkg',
      version: '1.2.3',
      description: 'hi',
      repository: 'my-repo',
      keywords: ['hi'],
      type: 'module',
      license: 'MIT',
      some_other_prop: 'hi',
      dont_copy_this: 'hi',
      engines: { node: '>=10', npm: '>=6' },
      ...pkg,
    }),
    'README.md': 'hi',
    LICENSE: 'hi',
    'postinstall.cjs': 'hi',
    'placeholder-bin.js': 'hi',
  })

  t.chdir(dir)
  t.capture(console, 'error')
  t.intercept(process, 'argv', {
    value: [
      process.execPath,
      resolve(import.meta.dirname, '../src/cli.ts'),
      ...argv,
    ],
  })

  await t.mockImport<typeof import('../src/cli.ts')>(
    '../src/cli.ts',
    {
      '../src/bundle.ts': t.createMock(Bundle, {
        bundle: async (o: unknown) => o,
      }),
      '../src/compile.ts': t.createMock(Compile, {
        compile: async (o: unknown) => o,
      }),
    },
  )

  return {
    dir,
    readOutdir: (p: string) => readdirSync(join(dir, p)).sort(),
    readPkg: (p: string) =>
      JSON.parse(readFileSync(join(dir, p, 'package.json'), 'utf8')),
  }
}

t.test('no publishConfig', async t => {
  const dir = 'outdir'
  const { readOutdir } = await mockCli(t, {
    argv: [`--outdir=${dir}`],
  })
  t.strictSame(readOutdir(dir), [], 'no files without publishConfig')
})

t.test('publishConfig', async t => {
  const dir = 'outdir'
  const { readPkg, readOutdir } = await mockCli(t, {
    pkg: {
      publishConfig: {
        directory: dir,
      },
    },
  })
  t.strictSame(readPkg(dir), {
    name: 'my-pkg',
    version: '1.2.3',
    description: 'hi',
    repository: 'my-repo',
    keywords: ['hi'],
    type: 'module',
    license: 'MIT',
    engines: { node: '>=10' },
  })
  t.strictSame(
    readOutdir(dir),
    ['LICENSE', 'README.md', 'package.json'].sort(),
  )
})

t.test('root compiled bin', async t => {
  const dir = 'outdir'
  const { readOutdir, readPkg } = await mockCli(t, {
    pkg: {
      publishConfig: {
        directory: dir,
        optionalDependencies: {
          'optional-dep': 'workspace:*',
        },
      },
    },
  })
  t.strictSame(readPkg(dir), {
    name: 'my-pkg',
    version: '1.2.3',
    description: 'hi',
    repository: 'my-repo',
    keywords: ['hi'],
    type: 'module',
    license: 'MIT',
    optionalDependencies: {
      'optional-dep': '1.2.3',
    },
  })
  t.strictSame(
    readOutdir(dir),
    [
      'LICENSE',
      'README.md',
      'package.json',
      'placeholder-bin.js',
      'postinstall.cjs',
    ].sort(),
  )
})

t.test('platform bin publish', async t => {
  const dir = 'outdir'
  const mockPlatformBin = (t: Test) =>
    mockCli(t, {
      pkg: {
        publishConfig: {
          directory: dir,
          os: ['darwin'],
          cpu: ['x64'],
          bin: {
            vlt: './vlt',
          },
        },
      },
    })

  t.test('basic', async t => {
    const { readOutdir, readPkg } = await mockPlatformBin(t)
    t.strictSame(readPkg(dir), {
      name: 'my-pkg',
      version: '1.2.3',
      description: 'hi',
      repository: 'my-repo',
      keywords: ['hi'],
      type: 'module',
      license: 'MIT',
      os: ['darwin'],
      cpu: ['x64'],
      bin: {
        vlt: './vlt',
      },
    })
    t.strictSame(
      readOutdir(dir),
      ['LICENSE', 'README.md', 'package.json'].sort(),
    )
  })

  t.test('publish', async t => {
    t.intercept(process, 'env', {
      value: { ...process.env, npm_command: 'publish' },
    })
    const { readOutdir, readPkg } = await mockPlatformBin(t)
    t.strictSame(readPkg(dir), {
      name: 'my-pkg',
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
