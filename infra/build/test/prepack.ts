import t from 'tap'
import type { Test } from 'tap'
import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import * as Bundle from '../src/bundle.ts'

const mockCli = async (
  t: Test,
  {
    workspaceName,
    pkg,
  }: {
    workspaceName: string
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
    },
  })
  const dir = join(testdir, workspaceName)

  t.chdir(dir)
  t.intercept(process, 'argv', {
    value: [
      process.execPath,
      resolve(import.meta.dirname, '../src/prepack.ts'),
    ],
  })

  const calls: {
    bundle: Bundle.Options[]
  } = {
    bundle: [],
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

t.test('bundled', async t => {
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
      vlxl: './vlxl.js',
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
