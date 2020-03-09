const clone = require('../lib/clone.js')
const revs = require('../lib/revs.js')

const t = require('tap')
const fs = require('fs')
const { spawn } = require('child_process')
const { resolve, join } = require('path')

// keep the fixture, because Windows fails when it tries to delete it,
// due to all the git operations happening inside.
t.saveFixture = true

const port = 12345 + (+process.env.TAP_CHILD_ID || 0)
const spawnGit = require('../lib/spawn.js')
const regularRepoDir = 'regular-folder'
const me = t.testdir({
  'submodule-repo': {},
  repo: {},
  [regularRepoDir]: {},
  'replacement-repo': {},
})
const remote = `git://localhost:${port}/repo`
const submodsRemote = `git://localhost:${port}/submodule-repo`
const replacementRemote = `git://localhost:${port}/replacement-repo`
const repo = resolve(me, 'repo')

let repoSha = ''
let submodsRepoSha = ''

t.setTimeout(120000)
t.test('create repo', { bail: true }, () => {
  const git = (...cmd) => spawnGit(cmd, { cwd: repo })
  const write = (f, c) => fs.writeFileSync(`${repo}/${f}`, c)
  return git('init', '-b', 'main')
    .then(() => git('config', 'user.name', 'pacotedev'))
    .then(() => git('config', 'user.email', 'i+pacotedev@izs.me'))
    .then(() => git('config', 'tag.gpgSign', 'false'))
    .then(() => git('config', 'commit.gpgSign', 'false'))
    .then(() => git('config', 'tag.forceSignAnnotated', 'false'))
    .then(() => write('foo', 'bar'))
    .then(() => git('add', 'foo'))
    .then(() => git('commit', '-m', 'foobar'))
    .then(() => git('tag', '-a', 'asdf', '-m', 'asdf'))
    .then(() => write('bar', 'foo'))
    .then(() => git('add', 'bar'))
    .then(() => git('commit', '-m', 'barfoo'))
    .then(() => git('tag', 'quux'))
    .then(() => write('bob', 'obo'))
    .then(() => git('add', 'bob'))
    .then(() => git('commit', '-m', 'bob plays the obo'))
    .then(() => write('pull-file', 'a humble request that you pull'))
    .then(() => git('add', 'pull-file'))
    .then(() => git('commit', '-m', 'the ref file'))
    .then(() => git('update-ref', 'refs/pull/1/head', 'HEAD'))
    .then(() => write('rando-ref', 'some rando ref'))
    .then(() => git('add', 'rando-ref'))
    .then(() => git('commit', '-m', 'so rando'))
    .then(() => git('update-ref', 'refs/rando/file', 'HEAD'))
    .then(() => write('other-file', 'file some other bits'))
    .then(() => git('add', 'other-file'))
    .then(() => git('commit', '-m', 'others'))
    .then(() => git('tag', '-am', 'version 1.2.3', 'version-1.2.3'))
    .then(() => git('tag', '-am', 'too big', '69' + Math.pow(2, 53) + '.0.0'))
    .then(() => write('gleep', 'glorp'))
    .then(() => git('add', 'gleep'))
    .then(() => git('commit', '-m', 'gleep glorp'))
    .then(() => git('tag', '-am', 'head version', '69.42.0'))
    .then(() => git('rev-parse', 'HEAD^')
      .then(({ stdout }) => {
        repoSha = stdout.trim()
        return repoSha
      })
    )
})

t.test('spawn daemon', { bail: true }, t => {
  const daemon = spawn('git', [
    'daemon',
    `--port=${port}`,
    '--export-all',
    '--verbose',
    '--informative-errors',
    '--reuseaddr',
    '--base-path=.',
    '--listen=localhost',
  ], { cwd: me, stdio: ['pipe', 1, 'pipe'] })
  const onDaemonData = c => {
    // prepare to slay the daemon
    const cpid = c.toString().match(/^\[(\d+)\]/)
    if (cpid && cpid[1]) {
      daemon.stderr.removeListener('data', onDaemonData)
      const pid = +cpid[1]
      t.parent.teardown(() => process.kill(pid))
      t.parent.on('bailout', () => process.kill(pid))
      t.end()
    }
  }
  daemon.stderr.on('data', onDaemonData)
  // only clean up the dir once the daemon is banished
  daemon.on('close', () => fs.rmSync(me, { recursive: true, force: true }))
})

t.test('create a repo with a submodule', { bail: true }, () => {
  const submoduleRepo = resolve(me, 'submodule-repo')
  const git = (...cmd) => spawnGit(cmd, { cwd: submoduleRepo })
  const write = (f, c) => fs.writeFileSync(`${submoduleRepo}/${f}`, c)
  return git('init', '-b', 'main')
    .then(() => git('config', 'user.name', 'pacotedev'))
    .then(() => git('config', 'user.email', 'i+pacotedev@izs.me'))
    .then(() => git('config', 'tag.gpgSign', 'false'))
    .then(() => git('config', 'commit.gpgSign', 'false'))
    .then(() => git('config', 'tag.forceSignAnnotated', 'false'))
    .then(() => write('file', 'data'))
    .then(() => git('add', 'file'))
    .then(() => git('commit', '-m', 'file'))
    .then(() => git('submodule', 'add', remote, 'fooblz'))
    .then(() => git('commit', '-m', 'add submodule'))
    .then(() => write('foo', 'bar'))
    .then(() => git('add', 'foo'))
    .then(() => git('commit', '-m', 'foobar'))
    .then(() => git('tag', '-a', 'asdf', '-m', 'asdf'))
    .then(() => write('bar', 'foo'))
    .then(() => git('add', 'bar'))
    .then(() => git('commit', '-m', 'barfoo'))
    .then(() => git('tag', 'quux'))
    .then(() => write('bob', 'obo'))
    .then(() => git('add', 'bob'))
    .then(() => git('commit', '-m', 'bob plays the obo'))
    .then(() => write('pull-file', 'a humble request that you pull'))
    .then(() => git('add', 'pull-file'))
    .then(() => git('commit', '-m', 'the ref file'))
    .then(() => git('update-ref', 'refs/pull/1/head', 'HEAD'))
    .then(() => write('rando-ref', 'some rando ref'))
    .then(() => git('add', 'rando-ref'))
    .then(() => git('commit', '-m', 'so rando'))
    .then(() => git('update-ref', 'refs/rando/file', 'HEAD'))
    .then(() => write('other-file', 'file some other bits'))
    .then(() => git('add', 'other-file'))
    .then(() => git('commit', '-m', 'others'))
    .then(() => git('tag', '-am', 'version 1.2.3', 'version-1.2.3'))
    .then(() => git('tag', '-am', 'too big', '69' + Math.pow(2, 53) + '.0.0'))
    .then(() => write('gleep', 'glorp'))
    .then(() => git('add', 'gleep'))
    .then(() => git('commit', '-m', 'gleep glorp'))
    .then(() => git('tag', '-am', 'head version', '69.42.0'))
    .then(() => git('rev-parse', 'HEAD^')
      .then(({ stdout }) => {
        submodsRepoSha = stdout.trim()
        return submodsRepoSha
      })
    )
})

const windowsPlatform = process.platform === 'win32' ? null : 'win32'
const posixPlatform = process.platform === 'win32' ? 'posix' : null
const platforms = [windowsPlatform, posixPlatform]
// note: localhost is not in shallowHosts, so null is like false
const shallows = [true, null]
const refs = [
  undefined,
  null,
  'refs/rando/file',
  'pull/1',
  '699007199254740992.0.0^^',
  'semver:1.x',
]

const npa = require('npm-package-arg')
const hashre = /^[a-f0-9]{40}$/

t.test('check every out', t => {
  t.jobs = 2
  t.plan(platforms.length)
  platforms.forEach(fakePlatform => t.test(`platform=${fakePlatform}`, t => {
    t.jobs = 2
    t.plan(shallows.length)
    shallows.forEach(gitShallow => t.test(`shallow=${gitShallow}`, t => {
      t.jobs = 2
      t.plan(refs.length + 1)
      refs.concat(repoSha).forEach(ref => t.test(`ref=${ref}`, t => {
        const safeRef = `${ref}`.replace(/[^a-z0-9.]/g, '-')
        const name = `${fakePlatform}-${gitShallow}-${safeRef}`
        const target = resolve(me, name)
        const spec = ref === undefined ? undefined : npa(remote + (ref ? `#${ref}` : ''))
        const opts = { fakePlatform, gitShallow, spec }
        return clone(remote, ref, target, opts)
          .then(sha => t.match(sha, hashre, `got a sha for ref=${ref}`))
      }))
    }))
  }))
})

t.test('again, with a submodule', async t => {
  t.jobs = 2
  t.plan(platforms.length)
  platforms.forEach(fakePlatform => t.test(`platform=${fakePlatform}`, t => {
    t.jobs = 2
    t.plan(shallows.length)
    shallows.forEach(gitShallow => t.test(`shallow=${gitShallow}`, t => {
      t.jobs = 2
      t.plan(refs.length + 1)
      refs.concat(submodsRepoSha).forEach(ref => t.test(`ref=${ref}`, async t => {
        const safeRef = `${ref}`.replace(/[^a-z0-9.]/g, '-')
        const name = `withsub-${fakePlatform}-${gitShallow}-${safeRef}`
        const cwd = resolve(me, name)
        fs.mkdirSync(cwd, { recursive: true })
        const target = resolve(cwd, 'submodule-repo')
        const spec = ref === undefined ? undefined : npa(remote + (ref ? `#${ref}` : ''))
        const opts = { fakePlatform, gitShallow, cwd, spec }
        const sha = await clone(submodsRemote, ref, undefined, opts)
        t.match(sha, hashre, `got a sha for ref=${ref}`)
        const sub = resolve(target, 'fooblz')
        t.ok(fs.statSync(sub).isDirectory(), 'sub is directory')
        t.equal(fs.readFileSync(sub + '/gleep', 'utf8'), 'glorp', 'gleep file is glorpy')
      }))
    }))
  }))
})

const clonedRepoDir = 'cloned-folder'
const clonedSpacesRepoDir = 'cloned folder with spaces'
const clonedSpacesRepoDir2 = 'cloned folder with spaces too'

const regularRepo = join(me, regularRepoDir)
const clonedRepo = join(me, clonedRepoDir)
const clonedRepoSpaces = join(me, clonedSpacesRepoDir)
const clonedRepoSpaces2 = join(me, clonedSpacesRepoDir2)

t.test('setup aditional tests', () => {
  const git = (...cmd) => spawnGit(cmd, { cwd: regularRepo })
  const write = (f, c) => fs.writeFileSync(`${regularRepo}/${f}`, c)
  return git('init', '-b', 'main')
    .then(() => git('config', 'user.name', 'pacotedev'))
    .then(() => git('config', 'user.email', 'i+pacotedev@izs.me'))
    .then(() => write('foo', 'bar'))
    .then(() => git('add', 'foo'))
    .then(() => git('commit', '-m', 'foobar'))
})

t.test('cloning to regular folder', t =>
  clone(join(regularRepo, '.git'), 'HEAD', clonedRepo)
    .then(() => revs(regularRepo))
    .then((r) => revs(clonedRepo).then((r2) => t.same(Object.keys(r.shas), Object.keys(r2.shas))))
)
t.test('cloning to folder with spaces', t =>
  clone(join(regularRepo, '.git'), 'HEAD', clonedRepoSpaces)
    .then(() => revs(regularRepo))
    .then((r) =>
      revs(clonedRepoSpaces).then((r2) =>
        t.same(Object.keys(r.shas), Object.keys(r2.shas))))
)

if ((process.platform) === 'win32') {
  t.test('cloning to folder with spaces with cmd as the shell on windows', t =>
    clone(join(regularRepo, '.git'), 'HEAD', clonedRepoSpaces2, { shell: 'cmd' })
      .then(() => revs(regularRepo))
      .then((r) =>
        revs(clonedRepoSpaces2).then((r2) =>
          t.same(Object.keys(r.shas), Object.keys(r2.shas)))
      )
  )
} else {
  t.test('cloning to folder with spaces with cmd as the shell not on windows', t =>
    clone(
      join(regularRepo, '.git'), 'HEAD',
      clonedRepoSpaces2,
      { fakePlatform: 'win32', shell: 'cmd' }
    )
      .then(() => revs(regularRepo))
      .then((r) =>
        revs(clonedRepoSpaces2).then((r2) =>
          t.same(Object.keys(r.shas), Object.keys(r2.shas)))
      )
  )
}

t.test('avoid having replacements break the world', { saveFixture: false }, async t => {
  let replacementSha
  t.before(async () => {
    // The replacement ends up being 2 steps behind HEAD
    const path = resolve(me, 'replacement-repo')
    const git = (...cmd) => spawnGit(cmd, { cwd: path, allowReplace: true })
    const write = (f, c) => fs.writeFileSync(`${path}/${f}`, c)
    await git('clone', '--mirror', remote, `${path}/.git`)
    await git('init', '-b', 'main')
    await git('config', 'user.name', 'pacotedev')
    await git('config', 'user.email', 'i+pacotedev@izs.me')
    await git('config', 'tag.gpgSign', 'false')
    await git('config', 'commit.gpgSign', 'false')
    await git('config', 'tag.forceSignAnnotated', 'false')
    await git('checkout', 'main')
    await git('checkout', '-b', 'replacement-branch')
    await write('replacement-file', 'replacement contents')
    await git('add', 'replacement-file')
    await git('commit', '-m', 'replacement commit')
    const { stdout } = await git('rev-parse', 'HEAD')
    replacementSha = stdout.trim()
    await git('checkout', 'main')
    await write('post-replacement', 'after replacement')
    await git('add', 'post-replacement')
    await git('commit', '-m', 'after the replacement')
    await git('replace', '-f', repoSha, replacementSha)
  })
  t.test('get the original thing by default', async t => {
    const path = t.testdir() + '/noreplace'
    await clone(replacementRemote, 'HEAD^^', path)
    t.throws(() => fs.statSync(resolve(path, 'replacement-file')), {
      code: 'ENOENT',
    }, 'should not have file from replacement commit')
  })
  t.test('get the replaced thing if allowReplace:true', async t => {
    const path = t.testdir() + '/yesreplace'
    await clone(replacementRemote, 'HEAD^^', path, { allowReplace: true })
    t.equal(fs.readFileSync(resolve(path, 'replacement-file'), 'utf8'),
      'replacement contents')
  })
})
