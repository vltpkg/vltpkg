import { spawn as spawnGit } from '@vltpkg/git'
import { Spec } from '@vltpkg/spec'
import { Pool } from '@vltpkg/tar'
import { Workspace } from '@vltpkg/workspaces'
import { lstatSync, readFileSync, readlinkSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { resolve as pathResolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import t from 'tap'
import { x as tarX } from 'tar'
import {
  extract,
  manifest,
  PackageInfoClient,
  packument,
  resolve,
  tarball,
} from '../src/index.js'
import { Manifest } from '@vltpkg/types'

t.saveFixture = true

const fixtures = pathResolve(import.meta.dirname, 'fixtures')
const pakuAbbrev = JSON.parse(
  readFileSync(pathResolve(fixtures, 'abbrev.json'), 'utf8'),
)
const pakuAbbrevFull = JSON.parse(
  readFileSync(pathResolve(fixtures, 'abbrev-full.json'), 'utf8'),
)
const tgzAbbrev = readFileSync(fixtures + '/abbrev-2.0.0.tgz')
const tgzFile = String(
  pathToFileURL(pathResolve(fixtures, 'abbrev-2.0.0.tgz')),
)

const shaRE = /^[0-9a-f]{40}$/
const corgiDoc =
  'application/vnd.npm.install-v1+json; q=1.0, application/json; q=0.8, */*'

const dir = t.testdir({
  cache: {},
  repo: {},
  pkg: {
    'package.json': JSON.stringify({
      name: 'abbrev',
      version: '2.0.0',
    }),
  },
})
const cache = `${dir}/cache`
const repo = `${dir}/repo`
const pkgDir = pathToFileURL(`${dir}/pkg`)

const PORT = 15443 + Number(process.env.TAP_CHILD_ID || 0)
const etag = '"yolo"'
const server = createServer((req, res) => {
  res.setHeader('connection', 'close')
  let response: any
  switch (req.url) {
    case '/abbrev/-/abbrev-2.0.0.tgz': {
      res.setHeader('content-type', 'application/octet-stream')
      res.setHeader('content-length', tgzAbbrev.byteLength)
      return res.end(tgzAbbrev)
    }
    case '/deleted': {
      const json = '{"error": "deleted"}'
      res.setHeader('content-length', json.length)
      res.statusCode = 404
      return res.end(json)
    }
    case '/no-dist': {
      const json = JSON.stringify({
        'dist-tags': { latest: '1.2.3' },
        versions: {
          '1.2.3': {
            name: 'no-dist',
            version: '1.2.3',
          },
        },
      })
      res.setHeader('content-length', json.length)
      return res.end(json)
    }
    case '/no-tgz': {
      const json = JSON.stringify({
        'dist-tags': { latest: '1.2.3' },
        versions: {
          '1.2.3': {
            name: 'no-tgz',
            version: '1.2.3',
            dist: {},
          },
        },
      })
      res.setHeader('content-length', json.length)
      return res.end(json)
    }
    case '/missing': {
      const json = JSON.stringify({
        'dist-tags': { latest: '1.2.3' },
        versions: {
          '1.2.3': {
            name: 'no-tgz',
            version: '1.2.3',
            dist: {
              tarball: `${defaultRegistry}missing.tgz`,
            },
          },
        },
      })
      res.setHeader('content-length', json.length)
      return res.end(json)
    }
    case '/abbrev': {
      if (req.headers['if-none-match'] === etag) {
        res.statusCode = 304
        return res.end()
      }
      switch (req.headers.accept) {
        case corgiDoc:
          response = pakuAbbrev
          break
        default:
          response = pakuAbbrevFull
          break
      }
      const j = Buffer.from(JSON.stringify(response))
      res.setHeader('cache-control', 'public, maxage=300')
      res.setHeader('etag', etag)
      res.setHeader('content-length', j.byteLength)
      return res.end(j)
    }
    default: {
      res.statusCode = 404
      t.comment('not found', req.url)
      notFoundURLs.push(String(req.url))
      return res.end(JSON.stringify({ error: 'not found' }))
    }
  }
})

const notFoundURLs: string[] = []

const defaultRegistry = `http://localhost:${PORT}/`
const options = {
  defaultRegistry,
  registry: defaultRegistry,
  cache,
}
for (const manifest of Object.values<Manifest>(pakuAbbrev.versions)) {
  if (manifest.dist?.tarball) {
    manifest.dist.tarball = manifest.dist.tarball.replace(
      /^https:\/\/registry.npmjs.org\//,
      defaultRegistry,
    )
  }
}
for (const manifest of Object.values<Manifest>(
  pakuAbbrevFull.versions,
)) {
  if (manifest.dist?.tarball) {
    manifest.dist.tarball = manifest.dist.tarball.replace(
      /^https:\/\/registry.npmjs.org\//,
      defaultRegistry,
    )
  }
}

t.before(() => new Promise<void>(res => server.listen(PORT, res)))
t.teardown(() => server.close())

let randoSha: string
t.test('create git repo', { bail: true }, async () => {
  const git = (...cmd: string[]) => spawnGit(cmd, { cwd: repo })
  const write = (f: string, c: string) => writeFile(`${repo}/${f}`, c)
  await git('init', '-b', 'main')
  await git('config', 'user.name', 'vltdev')
  await git('config', 'user.email', 'vltdev@vlt.sh')
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
  await write(
    'package.json',
    JSON.stringify({
      name: 'abbrev',
      version: '2.0.0',
    }),
  )
  await git('add', 'package.json')
  await git('commit', '-m', 'add package.json')
  await git('add', 'rando-ref')
  await git('commit', '-m', 'so rando')
  randoSha = (await git('show', '--no-patch', '--pretty=%H', 'HEAD'))
    .stdout
  await git('update-ref', 'refs/rando/file', 'HEAD')
  await write('other-file', 'file some other bits')
  await git('add', 'other-file')
  await git('commit', '-m', 'others')
  await git('tag', '-am', 'version 1.2.3', 'version-1.2.3')
  await git('tag', '-am', 'too big', `69${Math.pow(2, 53)}.0.0`)
  await write('gleep', 'glorp')
  await git('add', 'gleep')
  await git('commit', '-m', 'gleep glorp')
  await git('tag', '-am', 'head version', '69.42.0')
})

t.test('packument', async t => {
  t.strictSame(await packument('abbrev', options), pakuAbbrev)
  t.strictSame(
    await packument('abbrev', {
      fullMetadata: true,
      ...options,
    }),
    pakuAbbrevFull,
  )

  t.matchSnapshot(
    await packument(
      `abbrev@${defaultRegistry}abbrev/-/abbrev-2.0.0.tgz`,
      options,
    ),
  )

  t.matchSnapshot(await packument(`abbrev@${tgzFile}`, options))

  t.matchOnly(
    await packument(
      'x@git+' + pathToFileURL(repo).toString(),
      options,
    ),
    {
      name: '',
      versions: {
        '69.42.0': {
          name: '',
          version: '69.42.0',
          sha: shaRE,
          ref: '69.42.0',
          rawRef: 'refs/tags/69.42.0',
          type: 'tag',
        },
        '1.2.3': {
          name: '',
          version: '1.2.3',
          sha: shaRE,
          ref: 'version-1.2.3',
          rawRef: 'refs/tags/version-1.2.3',
          type: 'tag',
        },
      },
      'dist-tags': { HEAD: '69.42.0', latest: '69.42.0' },
      refs: {
        HEAD: {
          name: '',
          version: '',
          sha: shaRE,
          ref: 'HEAD',
          rawRef: 'HEAD',
          type: 'head',
        },
        main: {
          name: '',
          version: '',
          sha: shaRE,
          ref: 'main',
          rawRef: 'refs/heads/main',
          type: 'branch',
        },
        'refs/heads/main': {
          name: '',
          version: '',
          sha: shaRE,
          ref: 'main',
          rawRef: 'refs/heads/main',
          type: 'branch',
        },
        'pull/1': {
          name: '',
          version: '',
          sha: shaRE,
          ref: 'pull/1',
          rawRef: 'refs/pull/1/head',
          type: 'pull',
        },
        'refs/pull/1/head': {
          name: '',
          version: '',
          sha: shaRE,
          ref: 'pull/1',
          rawRef: 'refs/pull/1/head',
          type: 'pull',
        },
        'refs/rando/file': {
          name: '',
          version: '',
          sha: shaRE,
          ref: 'refs/rando/file',
          rawRef: 'refs/rando/file',
          type: 'other',
        },
        '69.42.0': {
          name: '',
          version: '69.42.0',
          sha: shaRE,
          ref: '69.42.0',
          rawRef: 'refs/tags/69.42.0',
          type: 'tag',
        },
        'refs/tags/69.42.0': {
          name: '',
          version: '69.42.0',
          sha: shaRE,
          ref: '69.42.0',
          rawRef: 'refs/tags/69.42.0',
          type: 'tag',
        },
        '699007199254740992.0.0': {
          name: '',
          version: '',
          sha: shaRE,
          ref: '699007199254740992.0.0',
          rawRef: 'refs/tags/699007199254740992.0.0',
          type: 'tag',
        },
        'refs/tags/699007199254740992.0.0': {
          name: '',
          version: '',
          sha: shaRE,
          ref: '699007199254740992.0.0',
          rawRef: 'refs/tags/699007199254740992.0.0',
          type: 'tag',
        },
        asdf: {
          name: '',
          version: '',
          sha: shaRE,
          ref: 'asdf',
          rawRef: 'refs/tags/asdf',
          type: 'tag',
        },
        'refs/tags/asdf': {
          name: '',
          version: '',
          sha: shaRE,
          ref: 'asdf',
          rawRef: 'refs/tags/asdf',
          type: 'tag',
        },
        quux: {
          name: '',
          version: '',
          sha: shaRE,
          ref: 'quux',
          rawRef: 'refs/tags/quux',
          type: 'tag',
        },
        'refs/tags/quux': {
          name: '',
          version: '',
          sha: shaRE,
          ref: 'quux',
          rawRef: 'refs/tags/quux',
          type: 'tag',
        },
        'version-1.2.3': {
          name: '',
          version: '1.2.3',
          sha: shaRE,
          ref: 'version-1.2.3',
          rawRef: 'refs/tags/version-1.2.3',
          type: 'tag',
        },
        'refs/tags/version-1.2.3': {
          name: '',
          version: '1.2.3',
          sha: shaRE,
          ref: 'version-1.2.3',
          rawRef: 'refs/tags/version-1.2.3',
          type: 'tag',
        },
      },
      shas: Object,
    },
  )
})

t.test('manifest', async t => {
  t.strictSame(
    await manifest('abbrev@2', options),
    pakuAbbrev.versions['2.0.0'],
  )
  t.strictSame(
    await manifest('abbrev@2', {
      fullMetadata: true,
      ...options,
    }),
    pakuAbbrevFull.versions['2.0.0'],
  )

  t.matchSnapshot(
    await manifest(
      `abbrev@${defaultRegistry}abbrev/-/abbrev-2.0.0.tgz`,
      options,
    ),
  )

  t.matchSnapshot(await manifest(`abbrev@${tgzFile}`, options))
  t.matchSnapshot(await manifest(`abbrev@${pkgDir}`, options))

  t.matchOnly(
    await manifest(
      'x@git+' + pathToFileURL(repo).toString(),
      options,
    ),
    {
      name: 'abbrev',
      version: '2.0.0',
      [Symbol.for('newline')]: '',
      [Symbol.for('indent')]: '',
    },
  )
})

t.test('resolve', async t => {
  t.matchOnly(await resolve('abbrev@2', options), {
    resolved: pakuAbbrev.versions['2.0.0'].dist.tarball,
    integrity: pakuAbbrev.versions['2.0.0'].dist.integrity,
    signatures: pakuAbbrev.versions['2.0.0'].dist.signatures,
    spec: Spec,
  })

  t.matchOnly(
    await resolve('abbrev@2', {
      fullMetadata: true,
      ...options,
    }),
    {
      resolved: pakuAbbrevFull.versions['2.0.0'].dist.tarball,
      integrity: pakuAbbrevFull.versions['2.0.0'].dist.integrity,
      signatures: pakuAbbrevFull.versions['2.0.0'].dist.signatures,
      spec: Spec,
    },
  )

  t.matchOnly(
    await resolve(
      `abbrev@${defaultRegistry}abbrev/-/abbrev-2.0.0.tgz`,
      options,
    ),
    {
      resolved: `${defaultRegistry}abbrev/-/abbrev-2.0.0.tgz`,
      spec: Spec,
    },
  )

  t.matchOnly(await resolve(`abbrev@${tgzFile}`, options), {
    resolved: fileURLToPath(tgzFile),
    spec: Spec,
  })
  t.matchOnly(await resolve(`abbrev@${pkgDir}`, options), {
    resolved: fileURLToPath(pkgDir),
    spec: Spec,
  })

  t.matchOnly(
    await resolve('x@git+' + pathToFileURL(repo).toString(), options),
    {
      resolved: 'git+' + pathToFileURL(repo).toString() + '#',
      spec: Spec,
    },
  )
  t.matchOnly(
    await resolve(
      `x@git+${pathToFileURL(repo)}#${randoSha.substring(0, 5)}`,
      options,
    ),
    {
      resolved: `git+${pathToFileURL(repo)}#${randoSha}`,
      spec: Spec,
    },
  )
  t.matchOnly(
    await resolve('x@fakey:abbrev-2.0.0.tgz', {
      'git-hosts': { fakey: `git+${pathToFileURL(repo)}#committish` },
      'git-host-archives': {
        fakey: `${defaultRegistry}abbrev/-/abbrev-2.0.0.tgz`,
      },
    }),
    {
      resolved: `${defaultRegistry}abbrev/-/abbrev-2.0.0.tgz`,
      spec: Spec,
    },
  )
})

t.test('tarball', async t => {
  t.strictSame(await tarball('abbrev@2', options), tgzAbbrev)

  t.strictSame(
    await tarball(
      `abbrev@${defaultRegistry}abbrev/-/abbrev-2.0.0.tgz`,
      options,
    ),
    tgzAbbrev,
  )

  t.strictSame(await tarball(`abbrev@${tgzFile}`, options), tgzAbbrev)

  // just verify we got a gzipped something there
  t.strictSame(
    (
      await tarball(
        'x@git+' + pathToFileURL(repo).toString(),
        options,
      )
    ).subarray(0, 2),
    Buffer.from([0x1f, 0x8b]),
  )
  t.strictSame(
    (await tarball(`x@${pkgDir}`, options)).subarray(0, 2),
    Buffer.from([0x1f, 0x8b]),
  )
})

t.test('extract', async t => {
  const dir = t.testdir()
  t.match(await extract('abbrev@2', dir + '/registry', options), {
    resolved: `${defaultRegistry}abbrev/-/abbrev-2.0.0.tgz`,
  })

  t.match(await extract(`abbrev@${pkgDir}`, dir + '/dir', options), {
    resolved: fileURLToPath(pkgDir),
  })
  t.equal(
    pathResolve(dir, readlinkSync(dir + '/dir')),
    fileURLToPath(pkgDir),
  )

  await t.rejects(
    extract(`abbrev@workspace:*`, dir + '/ws', options),
    { message: 'Not in a monorepo, cannot resolve workspace spec' },
  )

  t.match(
    await extract(
      `abbrev@${defaultRegistry}abbrev/-/abbrev-2.0.0.tgz`,
      dir + '/remote',
      options,
    ),
    { resolved: `${defaultRegistry}abbrev/-/abbrev-2.0.0.tgz` },
  )

  t.match(
    await extract(`abbrev@${tgzFile}`, dir + '/file', options),
    { resolved: fileURLToPath(tgzFile) },
  )

  t.match(
    await extract(
      'x@git+' + pathToFileURL(repo).toString(),
      dir + '/git',
      options,
    ),
    { resolved: 'git+' + pathToFileURL(repo).toString() + '#' },
  )
  for (const p of ['registry', 'remote', 'file', 'git']) {
    const json = readFileSync(`${dir}/${p}/package.json`, 'utf8')
    const pkg = JSON.parse(json)
    t.match(
      pkg,
      { name: 'abbrev', version: '2.0.0' },
      p + ' result matches',
    )
  }
})

t.test('extraction failures', async t => {
  const dir = t.testdir()
  const { extract, manifest } = await t.mockImport(
    '../src/index.js',
    {
      '@vltpkg/tar': {
        Pool: class Pool {
          async unpack() {
            throw new Error('no tar for you')
          }
        },
      },
    },
  )
  t.rejects(extract('abbrev@2', dir + '/registry', options))

  t.rejects(
    extract(
      `abbrev@${defaultRegistry}abbrev/-/abbrev-2.0.0.tgz`,
      dir + '/remote',
      options,
    ),
  )
  t.rejects(
    manifest(
      `abbrev@${defaultRegistry}abbrev/-/abbrev-2.0.0.tgz`,
      options,
    ),
  )
  t.rejects(manifest(`abbrev@${tgzFile}`))

  t.rejects(extract(`abbrev@${tgzFile}`, dir + '/file', options))
})

t.test('manifest must provide actual dist results', async t => {
  t.rejects(resolve('deleted@latest', options))
  t.rejects(resolve('no-tgz@latest', options))
  t.rejects(resolve('no-dist@latest', options))
  t.rejects(tarball('deleted@latest', options))
  t.rejects(tarball('no-tgz@latest', options))
  t.rejects(tarball('no-dist@latest', options))
})

t.test('git spec must have gitRemote', async t => {
  t.rejects(
    resolve({
      toString: () => 'x',
      final: { type: 'git' },
    } as Spec),
    {
      message: 'no remote on git specifier',
      cause: { code: 'ERESOLVE' },
    },
  )
  t.rejects(
    manifest({
      toString: () => 'x',
      final: { type: 'git' },
    } as Spec),
    {
      message: 'no git remote',
      cause: { code: 'ERESOLVE' },
    },
  )
  t.rejects(
    packument({
      toString: () => 'x',
      final: { type: 'git' },
    } as Spec),
    {
      message: 'git remote could not be determined',
      cause: { code: 'ERESOLVE' },
    },
  )
  t.rejects(
    tarball({
      toString: () => 'x',
      final: { type: 'git' },
    } as Spec),
  )
  t.rejects(
    extract(
      {
        toString: () => 'x',
        final: { type: 'git' },
      } as Spec,
      t.testdir(),
    ),
  )
})
t.test('fails on version that is not present', async t =>
  t.rejects(resolve('abbrev@999', options)),
)

t.test('remote spec must have remoteURL', async t => {
  t.rejects(
    resolve(
      {
        toString: () => 'x',
        final: { type: 'remote' },
      } as Spec,
      options,
    ),
  )
  t.rejects(
    packument(
      {
        toString: () => 'x',
        final: { type: 'remote' },
      } as Spec,
      options,
    ),
  )
  t.rejects(
    manifest(
      {
        toString: () => 'x',
        final: { type: 'remote' },
      } as Spec,
      options,
    ),
  )
  t.rejects(
    tarball(
      {
        toString: () => 'x',
        final: { type: 'remote' },
      } as Spec,
      options,
    ),
  )
  t.rejects(packument(`x@git+${pkgDir}`, options))
})

t.test('file spec must have file', async t => {
  t.rejects(
    resolve({
      toString: () => 'x',
      final: { type: 'file' },
    } as Spec),
  )
  t.rejects(
    packument({
      toString: () => 'x',
      final: { type: 'file' },
    } as Spec),
  )
  t.rejects(
    manifest({
      toString: () => 'x',
      final: { type: 'file' },
    } as Spec),
  )
  t.rejects(
    tarball({
      toString: () => 'x',
      final: { type: 'file' },
    } as Spec),
  )
})

t.test('fails on non-200 response', async t => {
  const d = t.testdir()
  t.rejects(packument('lodash', options))
  t.rejects(manifest('lodash', options))
  t.rejects(tarball('lodash', options))
  t.rejects(resolve('lodash', options))
  t.rejects(tarball('missing', options))
  t.rejects(extract('missing', d, options))

  t.rejects(packument(`lodash@${defaultRegistry}lodash.tgz`, options))
  t.rejects(manifest(`lodash@${defaultRegistry}lodash.tgz`, options))
  t.rejects(tarball(`lodash@${defaultRegistry}lodash.tgz`, options))
  t.rejects(
    extract(`lodash@${defaultRegistry}lodash.tgz`, d, options),
  )
})

t.test('workspace specs', async t => {
  const dir = t.testdir({
    'vlt-workspaces.json': JSON.stringify('p/*'),
    p: {
      a: { 'package.json': '{"name":"a"}' },
      b: { 'package.json': '{"name":"b"}' },
    },
    tarx: {},
  })
  const opts = {
    ...options,
    projectRoot: dir,
  }
  t.equal(
    (await resolve('b@workspace:*', opts)).resolved,
    pathResolve(dir, 'p/b'),
  )
  const tb = await tarball('a@workspace:*', opts)
  const tx = tarX({
    sync: true,
    cwd: dir + '/tarx',
    strip: 1,
  })
  tx.end(tb)
  t.equal(
    readFileSync(dir + '/tarx/package.json', 'utf8'),
    '{"name":"a"}',
  )

  t.match(await manifest('a@workspace:b@*', opts), {
    name: 'b',
  })
  t.equal(
    (await extract('b@workspace:a@*', dir + '/x', opts)).resolved,
    pathResolve(dir, 'p/a'),
  )
  t.equal(lstatSync(dir + '/x').isSymbolicLink(), true)
  t.equal(
    readFileSync(dir + '/x/package.json', 'utf8'),
    '{"name":"a"}',
  )
})

t.test('workspace group option', async t => {
  const dir = t.testdir({
    'vlt-workspaces.json': JSON.stringify({
      a: 'p/a*',
      b: ['p/b', 'p/bb'],
      ab: 'p/?',
      aabb: ['p/??'],
      all: 'p/*',
    }),
    p: {
      a: { 'package.json': '{"name":"a"}' },
      b: { 'package.json': '{"name":"b"}' },
      aa: { 'package.json': '{"name":"aa"}' },
      bb: { 'package.json': '{"name":"bb"}' },
    },
  })
  const opts = {
    ...options,
    projectRoot: dir,
    // only load the ones that are 1 char
    workspace: ['p/[a-z]'],
    // even though the `'b'` group includes 'bb'
    'workspace-group': ['ab', 'b'],
  }
  const pi = new PackageInfoClient(opts)
  t.match(pi.monorepo?.get('a'), Workspace)
  t.match(pi.monorepo?.get('b'), Workspace)
  t.equal(pi.monorepo?.get('bb'), undefined)
  t.equal(pi.monorepo?.get('aa'), undefined)
  await t.rejects(pi.resolve('aa@workspace:*'))
  t.end()
})

t.test('verify we got the expected missing urls', t => {
  t.matchSnapshot(notFoundURLs.sort((a, b) => a.localeCompare(b)))
  t.end()
})

t.test(
  'fake packument with manifest lacking name/version',
  async t => {
    const dir = t.testdir({ 'package.json': '{}' })
    const spec = `x@${pathToFileURL(dir)}`
    t.matchSnapshot(await packument(spec))
  },
)

t.test('path git selector', async t => {
  const pkg = {
    name: 'xyz',
    version: '1.2.3',
    [Symbol.for('indent')]: '',
    [Symbol.for('newline')]: '',
  }
  const pj = JSON.stringify(pkg)
  const dir = t.testdir({
    repo: {
      packages: {
        xyz: {},
      },
    },
    target: {},
  })

  const repo = pathResolve(dir, 'repo')
  const badSpec = `xyz@git+${pathToFileURL(repo)}`
  const spec = `${badSpec}#path:packages/xyz`

  let headSha: string | undefined = undefined
  t.test('create repo', async () => {
    const git = (...cmd: string[]) => spawnGit(cmd, { cwd: repo })
    const write = (f: string, c: string) =>
      writeFile(`${repo}/${f}`, c)
    await git('init', '-b', 'main')
    await git('config', 'user.name', 'vltdev')
    await git('config', 'user.email', 'vltdev@vlt.sh')
    await git('config', 'tag.gpgSign', 'false')
    await git('config', 'commit.gpgSign', 'false')
    await git('config', 'tag.forceSignAnnotated', 'false')
    await write('packages/xyz/package.json', pj)
    await git('add', 'packages/xyz/package.json')
    await git('commit', '-m', 'xyz@1.2.3')
    await git('tag', '-a', 'xyz@1.2.3', '-m', 'xyz@1.2.3')
    const { stdout } = await git('rev-parse', 'HEAD')
    headSha = stdout
  })

  t.test('resolve', async t => {
    const r = await resolve(spec, options)
    t.equal(
      r.resolved,
      `git+${pathToFileURL(repo)}#${headSha}::path:packages/xyz`,
    )
    t.end()
  })

  t.test('manifest', async t => {
    const m = await manifest(spec, options)
    t.strictSame(m, pkg)
    t.rejects(() => manifest(badSpec, options))
  })

  t.test('tarball', async t => {
    const target = t.testdir()
    const pool = new Pool()
    const tarData = await tarball(spec, options)
    await pool.unpack(tarData, target)
    const found = JSON.parse(
      readFileSync(target + '/package.json', 'utf8'),
    )
    t.strictSame(
      {
        ...found,
        [Symbol.for('newline')]: '',
        [Symbol.for('indent')]: '',
      },
      pkg,
    )
  })

  t.test('extract', async t => {
    const target = t.testdir()
    await extract(spec, target, options)
    const found = JSON.parse(
      readFileSync(target + '/package.json', 'utf8'),
    )
    found[Symbol.for('newline')] = pkg[Symbol.for('newline')]
    found[Symbol.for('indent')] = pkg[Symbol.for('indent')]
    t.strictSame(found, pkg)
  })
})
