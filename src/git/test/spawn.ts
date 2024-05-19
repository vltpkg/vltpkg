import { error } from '@vltpkg/error-cause'
import fs from 'fs'
import { resolve } from 'path'
import t from 'tap'
import { GitOptions } from '../src/index.js'
import { spawn } from '../src/spawn.js'

t.rejects(spawn(['status'], { git: false }), {
  message: 'No git binary found in $PATH',
  cause: { code: 'ENOGIT' },
})

const slash = (s: string) => s.replace(/\\/g, '/')

const repo = t.testdir()

// init a repo.  this also tests the happy path and default options
t.test('setup repo', t => {
  const cwd = process.cwd()
  t.teardown(() => process.chdir(cwd))
  process.chdir(repo)
  return t.resolveMatch(spawn(['init']), {
    stdout: `Initialized empty Git repository in ${slash(fs.realpathSync.native(repo))}`,
  })
})

t.test('argument test for allowReplace', async t => {
  // Note: the *actual* impact of allowReplace:true is tested in
  // test/clone.js, since it covers the use case that is relevant
  // for our purposes.  This just tests that the argument is added
  // by default.
  const { spawn: mockedSpawn } = await t.mockImport(
    '../src/spawn.js',
    {
      '@vltpkg/promise-spawn': {
        promiseSpawn: async (_: string, args: string[]) => args,
      },
    },
  )
  const result = await mockedSpawn(['a', 'b', 'c'])
  t.same(
    result,
    ['--no-replace-objects', 'a', 'b', 'c'],
    'replacements not allowed',
  )
})

t.test('retries', async t => {
  const gitMessage = 'Connection timed out'
  const te = resolve(repo, 'transient-error.js')
  fs.writeFileSync(
    te,
    `
console.error('${gitMessage.trim()}')
process.exit(1)
  `,
  )
  const retryOptions: GitOptions = {
    'fetch-retries': 2,
    'fetch-retry-factor': 1,
    'fetch-retry-maxtimeout': 1000,
    'fetch-retry-mintimeout': 1,
  }
  const er = error('A git connection error occurred', {
    cmd: process.execPath,
    args: [te],
    status: 1,
    signal: null,
    stdout: '',
    stderr: gitMessage,
  })
  await t.rejects(
    spawn([te], {
      cwd: repo,
      git: process.execPath,
      ...retryOptions,
      //@ts-ignore
      allowReplace: true,
    }),
    er,
  )
  t.end()
})

t.test('missing pathspec', t => {
  const gitMessage =
    "error: pathspec 'foo' did not match any file(s) known to git"
  const te = resolve(repo, 'pathspec-error.js')
  fs.writeFileSync(
    te,
    `
console.error("${gitMessage.trim()}")
process.exit(1)
  `,
  )
  const er = error('The git reference could not be found', {
    cmd: process.execPath,
    args: [te],
    status: 1,
    signal: null,
    stdout: '',
    stderr: gitMessage,
  })
  t.rejects(
    spawn([te], {
      cwd: repo,
      git: process.execPath,
      //@ts-ignore
      allowReplace: true,
    }),
    er,
  )
  t.end()
})

t.test('unknown git error', t => {
  const gitMessage = 'error: something really bad happened to git'
  const te = resolve(repo, 'unknown-error.js')
  fs.writeFileSync(
    te,
    `
console.error("${gitMessage.trim()}")
process.exit(1)
  `,
  )
  const er = error('An unknown git error occurred', {
    cmd: process.execPath,
    args: [te],
    status: 1,
    signal: null,
    stdout: '',
    stderr: gitMessage,
  })
  t.rejects(
    spawn([te], {
      cwd: repo,
      git: process.execPath,
      //@ts-ignore
      allowReplace: true,
    }),
    er,
  )
  t.end()
})
