import { Spec } from '@vltpkg/spec'
import { ChildProcess, spawn } from 'child_process'
import fs from 'fs'
import { join, resolve } from 'path'
import t, { Test } from 'tap'
import { pathToFileURL } from 'url'
import { clone } from '../src/clone.js'
import { revs } from '../src/revs.js'
import { spawn as spawnGit } from '../src/spawn.js'

// keep the fixture, because Windows fails when it tries to delete it,
// due to all the git operations happening inside.
t.saveFixture = true

const port = 12345 + Number(process.env.TAP_CHILD_ID || 0)
const regularRepoDir = 'regular-folder'
const me = t.testdir({
  'submodule-repo': {},
  repo: {},
  [regularRepoDir]: {},
  'replacement-repo': {},
})
const remote = `git://localhost:${port}/repo`
const submodsRemote = `git://localhost:${port}/submodule-repo`
const repo = resolve(me, 'repo')
const repoUrl = String(pathToFileURL(repo))

let repoSha = ''
let submodsRepoSha = ''

t.setTimeout(120000)
t.test('create repo', { bail: true }, async () => {
  const git = (...cmd: string[]) => spawnGit(cmd, { cwd: repo })
  const write = (f: string, c: string) =>
    fs.promises.writeFile(`${repo}/${f}`, c)
  await git('init', '-b', 'main')
  await git('config', 'user.name', 'pacotedev')
  await git('config', 'user.email', 'i+pacotedev@izs.me')
  await git('config', 'tag.gpgSign', 'false')
  await git('config', 'commit.gpgSign', 'false')
  await git('config', 'tag.forceSignAnnotated', 'false')
  await write('foo', 'bar')
  await git('add', 'foo')
  await git('commit', '-m', 'foobar')
  await git('tag', '-a', 'asdf', '-m', 'asdf')
  await write('bar', 'foo')
  await git('add', 'bar')
  await git('commit', '-m', 'barfoo')
  await git('tag', 'quux')
  await write('bob', 'obo')
  await git('add', 'bob')
  await git('commit', '-m', 'bob plays the obo')
  await write('pull-file', 'a humble request that you pull')
  await git('add', 'pull-file')
  await git('commit', '-m', 'the ref file')
  await git('update-ref', 'refs/pull/1/head', 'HEAD')
  await write('rando-ref', 'some rando ref')
  await git('add', 'rando-ref')
  await git('commit', '-m', 'so rando')
  await git('update-ref', 'refs/rando/file', 'HEAD')
  await write('other-file', 'file some other bits')
  await git('add', 'other-file')
  await git('commit', '-m', 'others')
  await git('tag', '-am', 'version 1.2.3', 'version-1.2.3')
  await git('tag', '-am', 'too big', '69' + Math.pow(2, 53) + '.0.0')
  await write('gleep', 'glorp')
  await git('add', 'gleep')
  await git('commit', '-m', 'gleep glorp')
  await git('tag', '-am', 'head version', '69.42.0')
  const { stdout } = await git('rev-parse', 'HEAD^')
  return stdout
})

t.test('spawn daemon', { bail: true }, t => {
  const daemon = spawn(
    'git',
    [
      'daemon',
      `--port=${port}`,
      '--export-all',
      '--verbose',
      '--informative-errors',
      '--reuseaddr',
      '--base-path=.',
      '--listen=localhost',
    ],
    { cwd: me, stdio: ['pipe', 1, 'pipe'] },
  )
  const p = t.parent as Test
  const onDaemonData = (c: ChildProcess) => {
    // prepare to slay the daemon
    const cpid = c.toString().match(/^\[(\d+)\]/)
    if (cpid && cpid[1]) {
      daemon.stderr?.removeListener('data', onDaemonData)
      const pid = +cpid[1]
      p.teardown(() => process.kill(pid))
      p.on('bailout', () => process.kill(pid))
      t.end()
    }
  }
  daemon.stderr?.on('data', onDaemonData)
  // only clean up the dir once the daemon is banished
  daemon.on('close', () =>
    fs.rmSync(me, { recursive: true, force: true }),
  )
})

t.test('create a repo with a submodule', { bail: true }, async () => {
  const submoduleRepo = resolve(me, 'submodule-repo')
  const git = (...cmd: string[]) =>
    spawnGit(cmd, { cwd: submoduleRepo })
  const write = (f: string, c: string) =>
    fs.promises.writeFile(`${submoduleRepo}/${f}`, c)
  await git('init', '-b', 'main')
  await git('config', 'user.name', 'pacotedev')
  await git('config', 'user.email', 'i+pacotedev@izs.me')
  await git('config', 'tag.gpgSign', 'false')
  await git('config', 'commit.gpgSign', 'false')
  await git('config', 'tag.forceSignAnnotated', 'false')
  await write('file', 'data')
  await git('add', 'file')
  await git('commit', '-m', 'file')
  await git('submodule', 'add', remote, 'fooblz')
  await git('commit', '-m', 'add submodule')
  await write('foo', 'bar')
  await git('add', 'foo')
  await git('commit', '-m', 'foobar')
  await git('tag', '-a', 'asdf', '-m', 'asdf')
  await write('bar', 'foo')
  await git('add', 'bar')
  await git('commit', '-m', 'barfoo')
  await git('tag', 'quux')
  await write('bob', 'obo')
  await git('add', 'bob')
  await git('commit', '-m', 'bob plays the obo')
  await write('pull-file', 'a humble request that you pull')
  await git('add', 'pull-file')
  await git('commit', '-m', 'the ref file')
  await git('update-ref', 'refs/pull/1/head', 'HEAD')
  await write('rando-ref', 'some rando ref')
  await git('add', 'rando-ref')
  await git('commit', '-m', 'so rando')
  await git('update-ref', 'refs/rando/file', 'HEAD')
  await write('other-file', 'file some other bits')
  await git('add', 'other-file')
  await git('commit', '-m', 'others')
  await git('tag', '-am', 'version 1.2.3', 'version-1.2.3')
  await git('tag', '-am', 'too big', '69' + Math.pow(2, 53) + '.0.0'),
    await write('gleep', 'glorp')
  await git('add', 'gleep')
  await git('commit', '-m', 'gleep glorp')
  await git('tag', '-am', 'head version', '69.42.0')
  const { stdout } = await git('rev-parse', 'HEAD^')
  return stdout
})

const windowsPlatform =
  process.platform === 'win32' ? undefined : 'win32'
const posixPlatform =
  process.platform === 'win32' ? 'darwin' : undefined
const platforms: (undefined | NodeJS.Platform)[] = [
  windowsPlatform,
  posixPlatform,
]
// note: localhost is not in shallowHosts, so null is like false
const shallows = [true, undefined]
const refs = [
  undefined,
  'refs/rando/file',
  'pull/1',
  '699007199254740992.0.0^^',
  'semver:1.x',
]

const hashre = /^[a-f0-9]{40}$/

t.test('check every out', t => {
  t.jobs = 2
  t.plan(platforms.length)
  platforms.forEach(fakePlatform =>
    t.test(`platform=${fakePlatform}`, t => {
      t.jobs = 2
      t.plan(shallows.length)
      shallows.forEach(gitShallow =>
        t.test(`shallow=${gitShallow}`, t => {
          t.jobs = 2
          t.plan(refs.length + 1)
          refs.concat(repoSha).forEach(ref =>
            t.test(`ref=${ref}`, async t => {
              const safeRef = `${ref}`.replace(/[^a-z0-9.]/g, '-')
              const name = `${fakePlatform}-${gitShallow}-${safeRef}`
              const target = resolve(me, name)
              const spec =
                ref === undefined ? undefined : (
                  Spec.parse(
                    'name@git+' + repoUrl + (ref ? `#${ref}` : ''),
                  )
                )
              const opts = { fakePlatform, gitShallow, spec }
              const sha = await clone(
                `git+${repoUrl}`,
                ref,
                target,
                opts,
              )
              t.match(sha, hashre, `got a sha for ref=${ref}`)
            }),
          )
        }),
      )
    }),
  )
})

t.test('again, with a submodule', async t => {
  t.jobs = 2
  t.plan(platforms.length)
  platforms.forEach(fakePlatform =>
    t.test(`platform=${fakePlatform}`, t => {
      t.jobs = 2
      t.plan(shallows.length)
      shallows.forEach(gitShallow =>
        t.test(`shallow=${gitShallow}`, t => {
          t.jobs = 2
          t.plan(refs.length + 1)
          refs.concat(submodsRepoSha).forEach(ref =>
            t.test(`ref=${ref}`, async t => {
              const safeRef = `${ref}`.replace(/[^a-z0-9.]/g, '-')
              const name = `withsub-${fakePlatform}-${gitShallow}-${safeRef}`
              const cwd = resolve(me, name)
              fs.mkdirSync(cwd, { recursive: true })
              const target = resolve(cwd, 'submodule-repo')
              const spec =
                ref === undefined ? undefined : (
                  Spec.parse(
                    'name@' + remote + (ref ? `#${ref}` : ''),
                  )
                )
              const opts = { fakePlatform, gitShallow, cwd, spec }
              const sha = await clone(
                submodsRemote,
                ref,
                undefined,
                opts,
              )
              t.match(sha, hashre, `got a sha for ref=${ref}`)
              const sub = resolve(target, 'fooblz')
              t.ok(fs.statSync(sub).isDirectory(), 'sub is directory')
              t.equal(
                fs.readFileSync(sub + '/gleep', 'utf8'),
                'glorp',
                'gleep file is glorpy',
              )
            }),
          )
        }),
      )
    }),
  )
})

const clonedRepoDir = 'cloned-folder'
const clonedSpacesRepoDir = 'cloned folder with spaces'

const regularRepo = join(me, regularRepoDir)
const clonedRepo = join(me, clonedRepoDir)
const clonedRepoSpaces = join(me, clonedSpacesRepoDir)

t.test('setup additional tests', async () => {
  const git = (...cmd: string[]) =>
    spawnGit(cmd, { cwd: regularRepo })
  const write = (f: string, c: string) =>
    fs.promises.writeFile(`${regularRepo}/${f}`, c)
  await git('init', '-b', 'main')
  await git('config', 'user.name', 'pacotedev')
  await git('config', 'user.email', 'i+pacotedev@izs.me')
  await git('config', 'tag.gpgSign', 'false')
  await git('config', 'commit.gpgSign', 'false')
  await git('config', 'tag.forceSignAnnotated', 'false')
  await write('foo', 'bar')
  await git('add', 'foo')
  await git('commit', '-m', 'foobar')
})

t.test('cloning to regular folder', async t => {
  await clone(join(regularRepo, '.git'), 'HEAD', clonedRepo)
  const r = await revs(regularRepo)
  const r2 = await revs(clonedRepo)
  t.ok(r, 'got revs from first repo')
  t.ok(r2, 'got revs from second repo')
  if (r && r2) {
    t.same(
      Object.keys(r.shas),
      Object.keys(r2.shas),
      'revs should match',
    )
  }
})

t.test('cloning to folder with spaces', async t => {
  await clone(join(regularRepo, '.git'), 'HEAD', clonedRepoSpaces)
  const r = await revs(regularRepo)
  const r2 = await revs(clonedRepoSpaces)
  t.ok(r, 'got revs from first repo')
  t.ok(r2, 'got revs from second repo')
  if (r && r2) {
    t.same(
      Object.keys(r.shas),
      Object.keys(r2.shas),
      'revs should match',
    )
  }
})
