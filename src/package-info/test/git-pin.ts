import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { pathToFileURL } from 'node:url'
import t from 'tap'
import type { Integrity } from '@vltpkg/types'
import { unload } from '@vltpkg/vlt-json'
import {
  cloneInstead,
  gitClonePin,
  gitPinnedCommit,
} from '../src/git-pin.ts'
import { PackageInfoClient } from '../src/index.ts'
import { Spec } from '@vltpkg/spec'
import { drainer } from './fixtures/drainer.ts'

const track = drainer(t)
const dir = t.testdir({ repo: {}, 'vlt.json': '{}' })
t.chdir(dir)
unload()
const repo = `${dir}/repo`
const git = (...args: string[]) =>
  execFileSync('git', args, { cwd: repo, encoding: 'utf8' }).trim()
const commit = (version: string) => {
  writeFileSync(
    `${repo}/package.json`,
    JSON.stringify({ name: 'pinned', version }),
  )
  git('add', 'package.json')
  git('commit', '-m', version)
  return git('rev-parse', 'HEAD')
}
git('init', '-b', 'main')
git('config', 'user.name', 'vltdev')
git('config', 'user.email', 'vltdev@vlt.sh')
git('config', 'commit.gpgSign', 'false')
const sha1 = commit('1.0.0')

const sri = (b: Buffer): Integrity =>
  `sha512-${createHash('sha512').update(b).digest('base64')}`

// a git host serving `git archive` tarballs. like GitLab, the root dir
// is named after the committish asked for, so ref and sha bytes differ.
// `nopax` archives a tree: no commit in its pax header.
const requests: string[] = []
const served = new Map<string, Buffer>()
const server = createServer((req, res) => {
  const url = req.url ?? ''
  requests.push(url)
  // a host that never answers
  if (url.startsWith('/down/')) return req.socket.destroy()
  const m = /^\/(labby|nopax)\/o\/r\/(.+)$/.exec(url)
  let body: Buffer
  try {
    if (!m) throw new Error('not found')
    const [, host, ish = ''] = m
    body = execFileSync(
      'git',
      [
        '-C',
        repo,
        'archive',
        '--format=tar.gz',
        `--prefix=r-${ish}/`,
        host === 'nopax' ? `${ish}^{tree}` : ish,
      ],
      { stdio: ['ignore', 'pipe', 'ignore'] },
    )
  } catch {
    res.statusCode = 404
    return res.end()
  }
  served.set(url, body)
  res.setHeader('content-type', 'application/octet-stream')
  res.end(body)
})
t.before(() => new Promise<void>(r => server.listen(0, r)))
t.teardown(() => server.close())
const base = () =>
  `http://localhost:${(server.address() as AddressInfo).port}`

let n = 0
const client = (cache = `${dir}/cache`, remote = repo) =>
  track(
    new PackageInfoClient({
      cache,
      'git-hosts': {
        labby: `git+${pathToFileURL(remote)}`,
        nopax: `git+${pathToFileURL(remote)}`,
        fixed: `git+${pathToFileURL(remote)}`,
        down: `git+${pathToFileURL(remote)}`,
      },
      'git-host-archives': {
        labby: `${base()}/labby/$1/$2/$committish`,
        nopax: `${base()}/nopax/$1/$2/$committish`,
        // no $committish: one url for every commit
        fixed: `${base()}/labby/$1/$2/main`,
        down: `${base()}/down/$1/$2/$committish`,
      },
    }),
  )
const count = (u: string) => requests.filter(r => r === u).length
const target = () => `${dir}/x${n++}`
const version = (d: string) =>
  (
    JSON.parse(readFileSync(`${d}/package.json`, 'utf8')) as {
      version: string
    }
  ).version

t.test('locks a ref to the archive at its commit', async t => {
  const pi = client()
  const ref = '/labby/o/r/main'
  const pinned = `/labby/o/r/${sha1}`
  const r = await pi.resolve('x@labby:o/r#main')
  t.match(r, { resolved: base() + pinned })
  t.equal(r.integrity, sri(served.get(pinned)!))
  t.not(r.integrity, sri(served.get(ref)!), 'sha url bytes')
  t.match(await pi.manifest('x@labby:o/r#main'), {
    version: '1.0.0',
    dist: { tarball: base() + pinned, integrity: r.integrity },
  })
  const d = target()
  t.match(await pi.extract('x@labby:o/r#main', d), {
    resolved: base() + pinned,
    integrity: r.integrity,
  })
  t.equal(version(d), '1.0.0')
  t.equal(count(ref), 1, 'ref fetched once per run')
})

t.test('a moved ref', async t => {
  const locked = await client().resolve('x@labby:o/r#main')
  const sha2 = commit('2.0.0')
  const ref = '/labby/o/r/main'
  const before = count(ref)
  const warm = await client().resolve('x@labby:o/r#main')
  t.match(warm, { resolved: `${base()}/labby/o/r/${sha2}` })
  t.equal(count(ref), before + 1, 'ref never from the cache')
  t.match(
    await client(`${dir}/cold`).resolve('x@labby:o/r#main'),
    { resolved: warm.resolved, integrity: warm.integrity },
    'cold',
  )

  // the lock wins, with or without its integrity
  for (const lock of [
    { resolved: locked.resolved, integrity: locked.integrity },
    { resolved: locked.resolved },
  ]) {
    const d = target()
    const pi = client(`${dir}/c${n}`)
    t.match(await pi.extract('x@labby:o/r#main', d, lock), {
      resolved: locked.resolved,
      integrity: locked.integrity,
    })
    t.equal(version(d), '1.0.0')
  }
  t.equal(count(ref), before + 2, 'no ref fetch to extract a lock')
})

t.test('a full sha is its own pin', async t => {
  const sha = git('rev-parse', 'HEAD')
  const url = `/labby/o/r/${sha}`
  const before = count(url)
  const spec = `x@labby:o/r#${sha}`
  t.match(await client().resolve(spec), { resolved: base() + url })
  t.match(await client().resolve(spec), { resolved: base() + url })
  t.ok(count(url) <= before + 1, 'cached')
})

t.test('no commit in the archive', async t => {
  const warn = t.capture(console, 'error')
  const sha = git('rev-parse', 'HEAD')
  t.match(
    await client().resolve('x@nopax:o/r#main'),
    { resolved: `${base()}/nopax/o/r/${sha}` },
    'git ls-remote',
  )
  const r = await client(`${dir}/c-nogit`, `${dir}/nope`).resolve(
    'x@nopax:o/r#main',
  )
  t.match(r, { resolved: `${base()}/nopax/o/r/main` }, 'the ref')
  t.equal(r.integrity, sri(served.get('/nopax/o/r/main')!))
  const w = warn()
  t.equal(w.length, 1, 'no warning for git ls-remote')
  t.match(w[0], {
    args: [/locked to .*\/nopax\/o\/r\/main, not a commit/],
  })
})

t.test('archive url without a committish', async t => {
  const ref = '/labby/o/r/main'
  const before = count(ref)
  const warn = t.capture(console, 'error')
  const r = await client().resolve('x@fixed:o/r#dev')
  t.match(r, { resolved: base() + ref })
  t.equal(r.integrity, sri(served.get(ref)!))
  t.equal(count(ref), before + 1, 'fetched once')
  t.match(warn(), [{ args: [/not a commit/] }], 'a moving url')
})

t.test('ref archive not found', async t => {
  await t.rejects(client().resolve('x@labby:o/r#nope'), {
    message: /failed to fetch URL/,
    cause: { code: 'ERESOLVE' },
  })
})

t.test('no ref: the HEAD archive at its commit', async t => {
  const head = '/labby/o/r/HEAD'
  const sha = git('rev-parse', 'HEAD')
  const pinned = `/labby/o/r/${sha}`
  const before = count(head)
  const pi = client()
  const r = await pi.resolve('x@labby:o/r')
  t.match(r, { resolved: base() + pinned })
  t.equal(r.integrity, sri(served.get(pinned)!))
  t.match(await pi.manifest('x@labby:o/r'), {
    dist: { tarball: base() + pinned, integrity: r.integrity },
  })
  const d = target()
  t.match(await pi.extract('x@labby:o/r', d), {
    resolved: base() + pinned,
  })
  t.equal(version(d), version(repo))
  t.equal(count(head), before + 1, 'HEAD fetched once per run')
})

t.test('no ref, locked to a clone or a remote', async t => {
  const sha = git('rev-parse', 'HEAD')
  const old = version(repo)
  const locked = `git+${pathToFileURL(repo)}#${sha}`
  commit('9.0.0')
  const before = requests.length
  const d = target()
  t.match(
    await client().extract('x@labby:o/r', d, { resolved: locked }),
    { resolved: locked },
  )
  t.equal(version(d), old, 'the locked commit')
  const d1 = target()
  await client().extract('x@labby:o/r#main', d1, { resolved: locked })
  t.equal(version(d1), old, 'a ref locked to a clone: that commit')
  const d2 = target()
  await client().extract('x@labby:o/r', d2, { resolved: 'labby:o/r' })
  t.equal(version(d2), '9.0.0', 'older lockfile: the default branch')
  t.equal(requests.length, before, 'no archive fetched')
  t.match(
    await client().resolve('x@labby:o/r'),
    { resolved: `${base()}/labby/o/r/${git('rev-parse', 'HEAD')}` },
    'moved HEAD, warm cache: the new commit',
  )
})

t.test('no ref, archive host not answering', async t => {
  const pi = client()
  t.match(
    (await pi.resolve('x@down:o/r')).resolved,
    /^git\+file:.*#[0-9a-f]{40}$/,
    'cloned',
  )
  await t.rejects(
    pi.resolve('x@down:o/r#main'),
    { message: /Request failed/ },
    'a ref is not cloned',
  )
})

t.test('no ref, submodules: cloned at the commit', async t => {
  writeFileSync(`${repo}/.gitmodules`, '[submodule "v"]\n')
  git('add', '.gitmodules')
  git('commit', '-m', 'submodules')
  t.teardown(() => {
    git('rm', '-q', '.gitmodules')
    git('commit', '-m', 'no submodules')
  })
  const sha = git('rev-parse', 'HEAD')
  const head = '/labby/o/r/HEAD'
  const before = count(head)
  const locked = `git+${pathToFileURL(repo)}#${sha}`
  const pi = client()
  const r = await pi.resolve('x@labby:o/r')
  t.equal(r.resolved, locked)
  t.notOk('integrity' in r, 'no integrity')
  t.strictSame((await pi.manifest('x@labby:o/r')).dist, {
    tarball: locked,
  })
  t.equal(count(head), before + 1, 'HEAD fetched once')
  t.equal(count(`/labby/o/r/${sha}`), 0, 'no sha archive')
  const n0 = requests.length
  const d = target()
  t.match(await pi.extract('x@labby:o/r', d), { resolved: locked })
  t.equal(requests.length, n0, 'cloned')
  t.equal(version(d), version(repo))
  t.match(
    await pi.resolve('x@labby:o/r#main'),
    { resolved: `${base()}/labby/o/r/${sha}` },
    'a ref: the archive',
  )
  const warn = t.capture(console, 'error')
  t.match(
    await client(`${dir}/c-sm`, `${dir}/nope`).resolve('x@nopax:o/r'),
    { resolved: `${base()}/nopax/o/r/HEAD` },
    'no commit: the HEAD archive',
  )
  t.match(warn(), [{ args: [/not a commit/] }])
})

t.test('cloneInstead', async t => {
  const er = (statusCode: number) =>
    new Error('x', { cause: { response: { statusCode } } })
  const noRef = Spec.parse('x@github:o/r')
  for (const s of [401, 403, 404, 410, 500]) {
    t.equal(cloneInstead(noRef, er(s)), true, String(s))
  }
  t.equal(
    cloneInstead(
      noRef,
      new Error('x', { cause: { code: 'EREQUEST' } }),
    ),
    true,
    'request failed',
  )
  t.equal(cloneInstead(noRef, new Error('x')), false, 'no cause')
  t.equal(cloneInstead(noRef, undefined), false, 'undefined')
  t.equal(
    cloneInstead(Spec.parse('x@github:o/r#main'), er(404)),
    false,
    'a ref',
  )
})

t.test('cloned git pins', async t => {
  const sha = 'a'.repeat(40)
  const remote = 'git+https://host/o/r.git'
  const f = (sel: string) => Spec.parse(`x@${remote}#${sel}`).final
  t.equal(gitClonePin(f('main'), sha), `${remote}#${sha}`)
  t.equal(
    gitClonePin(f('main::path:a/b'), sha),
    `${remote}#${sha}::path:a/b`,
  )
  t.equal(
    gitClonePin(f('semver:1'), sha),
    `${remote}#${sha}`,
    'no range',
  )
  for (const [resolved, commit] of [
    [`${remote}#${sha}`, sha],
    [`${remote}#${sha}::path:a`, sha],
    [`${remote}#${'b'.repeat(64)}`, 'b'.repeat(64)],
    [`${remote}#abc1234`, undefined],
    [`${remote}#main`, undefined],
    [remote, undefined],
    [undefined, undefined],
  ] as const) {
    t.equal(gitPinnedCommit(resolved), commit, String(resolved))
  }
})
