const spawn = require('../lib/spawn.js')
const errors = require('../lib/errors.js')

const t = require('tap')
t.rejects(spawn(['status'], { git: false }), {
  message: 'No git binary found in $PATH',
  code: 'ENOGIT',
})

const slash = require('slash')
const { resolve } = require('path')
const repo = t.testdir()

const fs = require('fs')
// init a repo.  this also tests the happy path and default options
t.test('setup repo', t => {
  const cwd = process.cwd()
  t.teardown(() => process.chdir(cwd))
  process.chdir(repo)
  return t.resolveMatch(spawn(['init']),
    { stdout: `Initialized empty Git repository in ${slash(fs.realpathSync.native(repo))}` })
})

t.test('argument test for allowReplace', async t => {
  // Note: the *actual* impact of allowReplace:true is tested in
  // test/clone.js, since it covers the use case that is relevant
  // for our purposes.  This just tests that the argument is added
  // by default.
  const mockedSpawn = t.mock('../lib/spawn.js', {
    '@npmcli/promise-spawn': async (exe, args) => args,
  })
  const [allow, deny, allowWithArg, denyWithArg] = await Promise.all([
    mockedSpawn(['a', 'b', 'c'], { allowReplace: true }),
    mockedSpawn(['a', 'b', 'c']),
    mockedSpawn(['--no-replace-objects', 'a', 'b', 'c'], { allowReplace: true }),
    mockedSpawn(['--no-replace-objects', 'a', 'b', 'c']),
  ])
  t.same(allow, ['a', 'b', 'c'], 'replacements allowed')
  t.same(deny, ['--no-replace-objects', 'a', 'b', 'c'], 'replacements not allowed')
  t.same(allowWithArg, ['--no-replace-objects', 'a', 'b', 'c'], 'allowed by config, not pruned out')
  t.same(denyWithArg, ['--no-replace-objects', 'a', 'b', 'c'], 'denied by config, not duplicated')
})

t.test('retries', t => {
  const logs = []
  process.on('log', (...log) => logs.push(log))
  const gitMessage = 'Connection timed out'
  const te = resolve(repo, 'transient-error.js')
  fs.writeFileSync(te, `
console.error('${gitMessage.trim()}')
process.exit(1)
  `)
  const retryOptions = {
    'one retry object': {
      retry: {
        retries: 2,
        factor: 1,
        maxTimeout: 1000,
        minTimeout: 1,
      },
    },
    'namespaced fetchRetry* configs': {
      fetchRetries: 2,
      fetchRetryFactor: 1,
      fetchRetryMaxtimeout: 1000,
      fetchRetryMintimeout: 1,
    },
  }
  const er = Object.assign(new errors.GitConnectionError(gitMessage), {
    cmd: process.execPath,
    args: [te],
    code: 1,
    signal: null,
    stdout: '',
    stderr: gitMessage,
    message: 'A git connection error occurred',
  })
  Object.keys(retryOptions).forEach(n => t.test(n, async t => {
    await t.rejects(spawn([te], {
      cwd: repo,
      git: process.execPath,
      allowReplace: true,
      ...(retryOptions[n]),
    }), er)
    t.same(logs, [
      [
        'silly',
        'git',
        `Retrying git command: ${te} attempt # 2`,
      ],
      [
        'silly',
        'git',
        `Retrying git command: ${te} attempt # 3`,
      ],
    ], 'got expected logs')
    logs.length = 0
  }))
  t.end()
})

t.test('missing pathspec', t => {
  const gitMessage = 'error: pathspec \'foo\' did not match any file(s) known to git'
  const te = resolve(repo, 'pathspec-error.js')
  fs.writeFileSync(te, `
console.error("${gitMessage.trim()}")
process.exit(1)
  `)
  const er = Object.assign(new errors.GitPathspecError(gitMessage), {
    cmd: process.execPath,
    args: [te],
    code: 1,
    signal: null,
    stdout: '',
    stderr: gitMessage,
    message: 'The git reference could not be found',
  })
  t.rejects(spawn([te], {
    cwd: repo,
    git: process.execPath,
    allowReplace: true,
  }), er)
  t.end()
})

t.test('unknown git error', t => {
  const gitMessage = 'error: something really bad happened to git'
  const te = resolve(repo, 'unknown-error.js')
  fs.writeFileSync(te, `
console.error("${gitMessage.trim()}")
process.exit(1)
  `)
  const er = Object.assign(new errors.GitUnknownError(gitMessage), {
    cmd: process.execPath,
    args: [te],
    code: 1,
    signal: null,
    stdout: '',
    stderr: gitMessage,
    message: 'An unknown git error occurred',
  })
  t.rejects(spawn([te], {
    cwd: repo,
    git: process.execPath,
    allowReplace: true,
  }), er)
  t.end()
})
