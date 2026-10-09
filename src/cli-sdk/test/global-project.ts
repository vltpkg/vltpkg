import { readFileSync, statSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import t from 'tap'
import {
  assertGlobalName,
  ensureGlobalProject,
  globalBinDir,
  globalCommands,
  globalWorkspaceName,
  globalWorkspacePath,
  globalWorkspacesDir,
} from '../src/global-project.ts'

t.test('constants', async t => {
  t.strictSame(
    [...globalCommands],
    ['install', 'uninstall', 'list', 'query', 'build'],
  )
  t.equal(globalWorkspacesDir, 'packages')
  t.equal(globalBinDir('/g'), resolve('/g', 'bin'))
})

t.test('names and paths', async t => {
  t.equal(globalWorkspaceName('eslint'), 'eslint-global-ws')
  t.equal(globalWorkspaceName('@s/p'), '@s/p-global-ws')
  t.equal(globalWorkspacePath('eslint'), 'packages/eslint-global-ws')
  t.equal(globalWorkspacePath('@s/p'), 'packages/@s+p-global-ws')
})

t.test('assertGlobalName', async t => {
  for (const name of ['eslint', '@s/p', 'Legacy_Name', 'a.b-c~d']) {
    t.doesNotThrow(() => assertGlobalName(name), name)
  }
  for (const name of [
    '../x',
    '..',
    '.',
    'a/b',
    '@s/../x',
    '@s/a/b',
    '@s/',
    'a\\b',
    '',
  ]) {
    t.throws(
      () => assertGlobalName(name),
      {
        message: 'Invalid package name',
        cause: { code: 'EUSAGE', found: name },
      },
      JSON.stringify(name),
    )
  }
  t.throws(() => globalWorkspacePath('../evil'), {
    cause: { code: 'EUSAGE' },
  })
})

t.test('ensureGlobalProject', async t => {
  const dir = t.testdir()
  const root = resolve(dir, 'global')
  ensureGlobalProject(root)
  const read = (f: string) => readFileSync(resolve(root, f), 'utf8')
  t.strictSame(JSON.parse(read('package.json')), {
    name: 'vlt-global',
    private: true,
  })
  t.strictSame(JSON.parse(read('vlt.json')), {
    workspaces: 'packages/*',
  })
  t.match(read('vlt.json'), /\n$/)
  t.ok(
    statSync(resolve(root, 'packages')).isDirectory(),
    'packages dir created',
  )

  // existing files are kept
  writeFileSync(resolve(root, 'package.json'), '{"name":"mine"}')
  ensureGlobalProject(root)
  t.equal(read('package.json'), '{"name":"mine"}')

  t.test('other write errors are thrown', async t => {
    const fs = await import('node:fs')
    const { ensureGlobalProject } = await t.mockImport<
      typeof import('../src/global-project.ts')
    >('../src/global-project.ts', {
      'node:fs': t.createMock(fs, {
        writeFileSync: () => {
          throw Object.assign(new Error('nope'), { code: 'EACCES' })
        },
      }),
    })
    t.throws(() => ensureGlobalProject(t.testdir()), {
      code: 'EACCES',
    })
  })
})
