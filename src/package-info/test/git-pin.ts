import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { pathToFileURL } from 'node:url'
import t from 'tap'
import type { Integrity } from '@vltpkg/types'
import { unload } from '@vltpkg/vlt-json'
import { gitClonePin, gitPinnedCommit } from '../src/git-pin.ts'
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
      },
      'git-host-archives': {
        labby: `${base()}/labby/$1/$2/$committish`,
        nopax: `${base()}/nopax/$1/$2/$committish`,
        // no $committish: one url for every commit
        fixed: `${base()}/labby/$1/$2/main`,
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
