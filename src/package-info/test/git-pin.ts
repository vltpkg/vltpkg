import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { pathToFileURL } from 'node:url'
import t from 'tap'
import type { CacheEntry } from '@vltpkg/registry-client'
import type { Integrity } from '@vltpkg/types'
import { unload } from '@vltpkg/vlt-json'
import {
  cloneInstead,
  gitArchiveRef,
  gitClonePin,
  gitPinnedCommit,
  gitPinResolution,
} from '../src/git-pin.ts'
import { PackageInfoClient } from '../src/index.ts'
import { Spec } from '@vltpkg/spec'
import { drainer } from './fixtures/drainer.ts'

const track = drainer(t)
const dir = t.testdir({ repo: {}, mono: {}, 'vlt.json': '{}' })
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
  const m = /^\/(labby|nopax|mono)\/o\/r\/(.+)$/.exec(url)
  let body: Buffer
  try {
    if (!m) throw new Error('not found')
    const [, host, ish = ''] = m
    body = execFileSync(
      'git',
      [
        '-C',
        host === 'mono' ? `${dir}/mono` : repo,
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
        gone: `git+${pathToFileURL(remote)}`,
        mono: `git+${pathToFileURL(remote)}`,
      },
      'git-host-archives': {
        labby: `${base()}/labby/$1/$2/$committish`,
        nopax: `${base()}/nopax/$1/$2/$committish`,
        // no $committish: one url for every commit
        fixed: `${base()}/labby/$1/$2/main`,
        down: `${base()}/down/$1/$2/$committish`,
        // every archive 404s, eg a private repo
        gone: `${base()}/gone/$1/$2/$committish`,
        mono: `${base()}/mono/$1/$2/$committish`,
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
  t.equal(count(`/labby/o/r/${sha}`), 1, 'then the sha archive')
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
  for (const s of [
    'github:o/r#main::path:a',
    'github:o/r#semver:1',
  ]) {
    t.equal(cloneInstead(Spec.parse(`x@${s}`), er(404)), true, s)
  }
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

t.test('gitArchiveRef', async t => {
  const ref = (s: string) => gitArchiveRef(Spec.parse(`x@${s}`).final)
  const gh = 'https://codeload.github.com/o/r/legacy.tar.gz'
  t.equal(ref('github:o/r#main'), `${gh}/main`)
  t.equal(ref('github:o/r#main::path:a'), `${gh}/main`, 'path')
  t.equal(ref('github:o/r#::path:a'), `${gh}/HEAD`, 'path, no ref')
  t.equal(ref('github:o/r#pull/1::path:a'), `${gh}/pull/1/head`)
  t.equal(ref('github:o/r#semver:1'), undefined, 'semver')
  t.equal(ref('git+https://host/o/r.git#main::path:a'), undefined)
})

t.test('gitPinResolution', async t => {
  const pin = {
    resolved: 'https://h/o/r/a',
    response: {} as CacheEntry,
  }
  const sha = 'a'.repeat(40)
  const p = Spec.parse('x@github:o/r#main::path:a')
  t.strictSame(gitPinResolution(p, { ...pin, sha }, 'sha512-x'), {
    resolved: `git+ssh://git@github.com:o/r.git#${sha}::path:a`,
    spec: p,
  })
  t.strictSame(
    gitPinResolution(p, pin, 'sha512-x'),
    { resolved: pin.resolved, integrity: 'sha512-x', spec: p },
    'no commit: the url',
  )
  const r = Spec.parse('x@github:o/r#main')
  t.strictSame(gitPinResolution(r, { ...pin, sha }, 'sha512-x'), {
    resolved: pin.resolved,
    integrity: 'sha512-x',
    spec: r,
  })
})

t.test('::path: and #semver: as archives', async t => {
  // its own repo: git caches refs per remote
  const mono = `${dir}/mono`
  const mgit = (...args: string[]) =>
    execFileSync('git', args, { cwd: mono, encoding: 'utf8' }).trim()
  mgit('init', '-b', 'main')
  mgit('config', 'user.name', 'vltdev')
  mgit('config', 'user.email', 'vltdev@vlt.sh')
  mgit('config', 'commit.gpgSign', 'false')
  mkdirSync(`${mono}/sub`)
  writeFileSync(`${mono}/package.json`, '{"name":"root"}')
  const release = (v: string) => {
    writeFileSync(
      `${mono}/sub/package.json`,
      JSON.stringify({ name: 'sub', version: v }),
    )
    mgit('add', '.')
    mgit('commit', '-m', v)
    mgit('tag', `v${v}`)
    return mgit('rev-parse', 'HEAD')
  }
  const s1 = release('1.0.0')
  const url = (sha: string) => `${base()}/mono/o/r/${sha}`
  const sriOf = (sha: string) => sri(served.get(`/mono/o/r/${sha}`)!)

  // no git needed: the remote doesn't exist
  const nogit = client(`${dir}/c-path`, `${dir}/nope`)
  const spec = 'x@mono:o/r#main::path:sub'
  const mani = await nogit.manifest(spec)
  t.match(mani, { name: 'sub', version: '1.0.0' })
  t.strictSame(mani.dist, {
    tarball: `${url(s1)}::path:sub`,
    integrity: sriOf(s1),
  })
  t.equal(
    (await nogit.resolve(spec)).resolved,
    `git+${pathToFileURL(`${dir}/nope`)}#${s1}::path:sub`,
    'resolve(): the commit, path kept',
  )
  t.equal(
    (await nogit.resolve(`x@mono:o/r#${s1}::path:sub`)).resolved,
    `git+${pathToFileURL(`${dir}/nope`)}#${s1}::path:sub`,
    'full sha too',
  )
  const lock = { resolved: url(s1), integrity: sriOf(s1) }
  const s2 = release('2.0.0')
  await nogit.drain()
  for (const c of [
    nogit,
    // a fresh client: from the cache file
    client(`${dir}/c-path`, `${dir}/nope`),
    client(`${dir}/c-path-cold`, `${dir}/nope`),
  ]) {
    const d = target()
    t.match(await c.extract(spec, d, lock), lock)
    t.strictSame(readdirSync(d), ['package.json'], 'only the dir')
    t.equal(version(d), '1.0.0', 'locked')
  }
  t.equal(count('/mono/o/r/main'), 1, 'ref fetched once')

  // the newest matching tag
  const pi = client(`${dir}/cache`, mono)
  t.match(await pi.resolve('x@mono:o/r#semver:^1'), {
    resolved: url(s1),
    integrity: sriOf(s1),
  })
  const both = 'x@mono:o/r#semver:2::path:sub'
  const m2 = await pi.manifest(both)
  t.equal(m2.version, '2.0.0')
  t.strictSame(m2.dist, {
    tarball: `${url(s2)}::path:sub`,
    integrity: sriOf(s2),
  })
  t.equal(
    (await pi.resolve(both)).resolved,
    `git+${pathToFileURL(mono)}#${s2}::path:sub`,
  )

  // archive not served, or no commit in its url: cloned, as before
  const pin = (sha: string, path = '') =>
    `git+${pathToFileURL(mono)}#${sha}${path}`
  for (const [s, pinned] of [
    ['gone:o/r#main::path:sub', pin(s2, '::path:sub')],
    ['gone:o/r#semver:^1', pin(s1)],
    ['fixed:o/r#main::path:sub', pin(s2, '::path:sub')],
    ['fixed:o/r#semver:^1', pin(s1)],
  ] as const) {
    t.match(
      await client(`${dir}/cache`, mono).manifest(`x@${s}`),
      { dist: { tarball: pinned } },
      s,
    )
  }
  t.equal(count('/gone/o/r/main'), 1)
  t.equal(count(`/gone/o/r/${s1}`), 1)
  // an older lockfile's clone row: that commit, no archive
  const before = requests.length
  const d = target()
  await pi.extract(spec, d, { resolved: pin(s1, '::path:sub') })
  t.equal(version(d), '1.0.0', 'clone row kept')
  t.equal(requests.length, before, 'no archive')
  await t.rejects(
    client().manifest('x@labby:o/r#main::path:nope'),
    { message: 'tar unpack failed' },
    'no such dir',
  )

  // submodules (archives omit them): cloned at the archive's commit;
  // the dir not in the archive, as one in a submodule
  writeFileSync(`${mono}/.gitmodules`, '[submodule "v"]\n')
  writeFileSync(`${mono}/.gitattributes`, 'sub export-ignore\n')
  const s3 = release('3.0.0')
  // a remote of its own: git caches tags per remote
  const msm = `${dir}/msm`
  execFileSync('git', ['clone', '-q', mono, msm])
  const sm = client(`${dir}/c-sm`, msm)
  const cpin = (path = '') => `git+${pathToFileURL(msm)}#${s3}${path}`
  // `::path:` first: one ref url's pin, other specs' paths
  for (const [s, pinned] of [
    ['mono:o/r#semver:^3', cpin()],
    ['mono:o/r#semver:^3::path:sub', cpin('::path:sub')],
    ['mono:o/r#main::path:sub', cpin('::path:sub')],
    [`mono:o/r#${s3}::path:sub`, cpin('::path:sub')],
    ['mono:o/r#::path:sub', cpin('::path:sub')],
    ['mono:o/r', cpin()],
  ] as const) {
    t.matchOnly(
      await sm.resolve(`x@${s}`),
      { resolved: pinned, spec: Spec },
      s,
    )
    const m = await sm.manifest(`x@${s}`)
    t.strictSame(m.dist, { tarball: pinned }, s)
    if (pinned.endsWith('sub')) t.equal(m.version, '3.0.0', s)
  }
  t.match(
    await sm.resolve('x@mono:o/r#main'),
    { resolved: url(s3), integrity: sriOf(s3) },
    'a ref: the archive',
  )
  // the dir at the pinned commit, not the ref's tip
  execFileSync('git', [
    '-C',
    msm,
    'update-ref',
    'refs/heads/main',
    s2,
  ])
  t.match(
    await client(`${dir}/c-sm2`, msm).manifest(
      'x@mono:o/r#main::path:sub',
    ),
    { version: '3.0.0', dist: { tarball: cpin('::path:sub') } },
    'at the pinned commit',
  )
})
