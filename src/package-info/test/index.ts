import { spawn as spawnGit } from '@vltpkg/git'
import { Spec } from '@vltpkg/spec'
import { Pool, unpackToStoreSync } from '@vltpkg/tar'
import type { StoreIndex, StoreLinker } from '@vltpkg/tar'
import { integrityHex } from '@vltpkg/types'
import type { Integrity, Manifest } from '@vltpkg/types'
import { unload } from '@vltpkg/vlt-json'
import { Workspace } from '@vltpkg/workspaces'
import {
  existsSync,
  lstatSync,
  readFileSync,
  readlinkSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { readdir, rm, utimes, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { basename, resolve as pathResolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createHash } from 'node:crypto'
import * as util from 'node:util'
import type { Test } from 'tap'
import t from 'tap'
import { x as tarX } from 'tar'
import type {
  PackageInfoClientExtractOptions,
  PackageInfoClientOptions,
  PackageInfoClientRequestOptions,
} from '../src/index.ts'
import { CacheEntry } from '@vltpkg/registry-client/cache-entry'
import {
  PackageInfoClient,
  PACKUMENT_ACCEPT,
  resetCapabilities,
} from '../src/index.ts'

t.saveFixture = true

// helper methods only for test
const extract = (
  spec: string | Spec,
  dir: string,
  options?: PackageInfoClientOptions &
    PackageInfoClientExtractOptions,
) => {
  return new PackageInfoClient({
    ...options,
    cache: t.testdirName,
  }).extract(spec, dir, options)
}

const resolve = (
  spec: string | Spec,
  options?: PackageInfoClientOptions &
    PackageInfoClientRequestOptions,
) => {
  return new PackageInfoClient({
    ...options,
    cache: t.testdirName,
  }).resolve(spec, options)
}

const packument = (
  spec: string | Spec,
  options?: PackageInfoClientOptions &
    PackageInfoClientRequestOptions,
) => {
  return new PackageInfoClient({
    ...options,
    cache: t.testdirName,
  }).packument(spec, options)
}

const manifest = (
  spec: string | Spec,
  options?: PackageInfoClientOptions &
    PackageInfoClientRequestOptions,
) => {
  return new PackageInfoClient({
    ...options,
    cache: t.testdirName,
  }).manifest(spec, options)
}

const fixtures = pathResolve(import.meta.dirname, 'fixtures')
const pakuAbbrev = JSON.parse(
  readFileSync(pathResolve(fixtures, 'abbrev-full.json'), 'utf8'),
)
const tgzAbbrev = readFileSync(fixtures + '/abbrev-2.0.0.tgz')
const tgzAbbrevSha512 = createHash('sha512')
  .update(tgzAbbrev)
  .digest('base64')
const tgzFile = String(
  pathToFileURL(pathResolve(fixtures, 'abbrev-2.0.0.tgz')),
)

const shaRE = /^[0-9a-f]{40}$/

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
  // `?stable` packument fixtures: a `stable-*` package answers a packument
  // whose newest version is a prerelease that `latest` does not point at,
  // and drops those versions -- and the dist-tag pointing at one -- when
  // the request carries `?stable`, the way the registry filters it.
  const stablePaku = /^\/(stable-[a-z-]+)(\?stable)?$/.exec(
    req.url ?? '',
  )
  if (stablePaku) {
    const [, name = '', filtered] = stablePaku
    stableRequests.push(req.url ?? '')
    const at = (version: string): Manifest => ({
      name,
      version,
      dist: {
        tarball: `${defaultRegistry}${name}/-/${name}-${version}.tgz`,
      },
    })
    const json = JSON.stringify({
      name,
      'dist-tags':
        filtered ?
          { latest: '1.1.0' }
        : { latest: '1.1.0', next: '2.0.0-rc.1' },
      versions: {
        '1.0.0': at('1.0.0'),
        '1.1.0': at('1.1.0'),
        ...(filtered ? {} : { '2.0.0-rc.1': at('2.0.0-rc.1') }),
      },
    })
    res.setHeader('content-type', 'application/json')
    res.setHeader('content-length', json.length)
    if (stableDelay) {
      setTimeout(() => res.end(json), stableDelay)
      return
    }
    return res.end(json)
  }
  // Everything below is a registry that does not serve the filter, and so
  // ignores the unknown parameter and answers the full packument -- what
  // the client counts on while the capability document is still in flight.
  switch (req.url?.replace(/\?stable$/, '')) {
    case '/abbrev/-/abbrev-2.0.0.tgz': {
      abbrevTgzRequests++
      res.setHeader('content-type', 'application/octet-stream')
      res.setHeader('content-length', tgzAbbrev.byteLength)
      res.setHeader(
        'integrity',
        pakuAbbrev.versions['2.0.0'].dist.integrity,
      )
      return res.end(tgzAbbrev)
    }
    case '/acme/npm/expired': {
      // what the vlt registry's edge answers when a token's `exp` has passed
      const json = JSON.stringify({
        code: 'TokenExpiredError',
        message:
          'Token expired. Authenticate again to get a new token.',
      })
      res.setHeader('content-type', 'application/json')
      res.setHeader('content-length', json.length)
      res.statusCode = 401
      return res.end(json)
    }
    case '/deleted': {
      const json = '{"error": "deleted"}'
      res.setHeader('content-length', json.length)
      res.statusCode = 404
      return res.end(json)
    }
    case '/no-dist': {
      const json = JSON.stringify({
        name: 'no-dist',
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
        name: 'no-tgz',
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
      const j = Buffer.from(JSON.stringify(pakuAbbrev))
      res.setHeader('cache-control', 'public, maxage=300')
      res.setHeader('etag', etag)
      res.setHeader('content-length', j.byteLength)
      return res.end(j)
    }
    case '/moving': {
      movingRequests++
      // etag tracks the dist-tag, so an unchanged packument 304s and a
      // moved one comes back 200
      const tag = `"${movingLatest}"`
      if (req.headers['if-none-match'] === tag) {
        res.statusCode = 304
        return res.end()
      }
      const json = Buffer.from(
        JSON.stringify({
          name: 'moving',
          'dist-tags': { latest: movingLatest },
          versions: {
            '1.0.0': { name: 'moving', version: '1.0.0' },
            '2.0.0': { name: 'moving', version: '2.0.0' },
          },
        }),
      )
      res.setHeader('cache-control', 'public, max-age=3600')
      res.setHeader('etag', tag)
      res.setHeader('content-length', json.byteLength)
      return res.end(json)
    }
    case '/coalesced': {
      coalescedPackumentRequests++
      coalescedPackumentAccept = req.headers.accept
      const json = Buffer.from(JSON.stringify(pakuAbbrev))
      res.setHeader('content-length', json.byteLength)
      setTimeout(() => res.end(json), 50)
      return
    }
    case '/corrupted/-/corrupted-1.0.0.tgz': {
      // Serve a tarball whose content does NOT match the integrity
      // in the manifest (simulates a supply-chain attack / registry bug)
      const corrupted = Buffer.from(tgzAbbrev)
      // Flip some bytes to corrupt it while keeping gzip magic
      corrupted[100] = (corrupted[100]! ^ 0xff) & 0xff
      corrupted[101] = (corrupted[101]! ^ 0xff) & 0xff
      res.setHeader('content-type', 'application/octet-stream')
      res.setHeader('content-length', corrupted.byteLength)
      res.setHeader(
        'integrity',
        pakuAbbrev.versions['2.0.0'].dist.integrity,
      )
      return res.end(corrupted)
    }
    case '/corrupted': {
      const json = JSON.stringify({
        name: 'corrupted',
        'dist-tags': { latest: '1.0.0' },
        versions: {
          '1.0.0': {
            name: 'corrupted',
            version: '1.0.0',
            dist: {
              tarball: `${defaultRegistry}corrupted/-/corrupted-1.0.0.tgz`,
              integrity: pakuAbbrev.versions['2.0.0'].dist.integrity,
            },
          },
        },
      })
      res.setHeader('content-type', 'application/json')
      res.setHeader('content-length', json.length)
      return res.end(json)
    }
    case '/corrupted-no-header/-/corrupted-no-header-1.0.0.tgz': {
      // Serve a corrupted tarball WITHOUT an integrity response
      // header. The registry client won't verify integrity at its
      // level, but the client-side sha512 check will catch it.
      const corrupted = Buffer.from(tgzAbbrev)
      corrupted[100] = (corrupted[100]! ^ 0xff) & 0xff
      corrupted[101] = (corrupted[101]! ^ 0xff) & 0xff
      res.setHeader('content-type', 'application/octet-stream')
      res.setHeader('content-length', corrupted.byteLength)
      // NOTE: no 'integrity' header set here
      return res.end(corrupted)
    }
    case '/corrupted-no-header': {
      const json = JSON.stringify({
        name: 'corrupted-no-header',
        'dist-tags': { latest: '1.0.0' },
        versions: {
          '1.0.0': {
            name: 'corrupted-no-header',
            version: '1.0.0',
            dist: {
              tarball: `${defaultRegistry}corrupted-no-header/-/corrupted-no-header-1.0.0.tgz`,
              integrity: pakuAbbrev.versions['2.0.0'].dist.integrity,
            },
          },
        },
      })
      res.setHeader('content-type', 'application/json')
      res.setHeader('content-length', json.length)
      return res.end(json)
    }
    case '/corrupted-once/-/corrupted-once-1.0.0.tgz': {
      // First request: serve corrupted tarball.
      // Second request: serve correct tarball.
      // This simulates a CDN serving stale/corrupted data that gets
      // fixed on retry.
      corruptedOnceServed++
      if (corruptedOnceServed <= 1) {
        const corrupted = Buffer.from(tgzAbbrev)
        corrupted[100] = (corrupted[100]! ^ 0xff) & 0xff
        corrupted[101] = (corrupted[101]! ^ 0xff) & 0xff
        res.setHeader('content-type', 'application/octet-stream')
        res.setHeader('content-length', corrupted.byteLength)
        res.setHeader(
          'integrity',
          pakuAbbrev.versions['2.0.0'].dist.integrity,
        )
        return res.end(corrupted)
      }
      // Second request: correct tarball
      res.setHeader('content-type', 'application/octet-stream')
      res.setHeader('content-length', tgzAbbrev.byteLength)
      res.setHeader(
        'integrity',
        pakuAbbrev.versions['2.0.0'].dist.integrity,
      )
      return res.end(tgzAbbrev)
    }
    case '/corrupted-once': {
      const json = JSON.stringify({
        name: 'corrupted-once',
        'dist-tags': { latest: '1.0.0' },
        versions: {
          '1.0.0': {
            name: 'corrupted-once',
            version: '1.0.0',
            dist: {
              tarball: `${defaultRegistry}corrupted-once/-/corrupted-once-1.0.0.tgz`,
              integrity: pakuAbbrev.versions['2.0.0'].dist.integrity,
            },
          },
        },
      })
      res.setHeader('content-type', 'application/json')
      res.setHeader('content-length', json.length)
      return res.end(json)
    }
    // vlt packuments: no dist.integrity, registry-relative tarball paths
    case '/digest':
    case '/digest-bad':
    case '/digest-missing': {
      const name = req.url.replace(/\?stable$/, '').slice(1)
      const json = JSON.stringify({
        name,
        'dist-tags': { latest: '1.0.0' },
        versions: {
          '1.0.0': {
            name,
            version: '1.0.0',
            dist: { tarball: `${name}/-/${name}-1.0.0.tgz` },
          },
        },
      })
      res.setHeader(
        'content-type',
        'application/vnd.vlt.packument-v1+json',
      )
      res.setHeader('content-length', json.length)
      return res.end(json)
    }
    case '/digest/-/digest-1.0.0.tgz': {
      res.setHeader('content-type', 'application/octet-stream')
      res.setHeader('content-length', tgzAbbrev.byteLength)
      res.setHeader('repr-digest', `sha-512=:${tgzAbbrevSha512}:`)
      return res.end(tgzAbbrev)
    }
    case '/digest-bad/-/digest-bad-1.0.0.tgz': {
      res.setHeader('content-type', 'application/octet-stream')
      res.setHeader('content-length', tgzAbbrev.byteLength)
      res.setHeader('repr-digest', `sha-512=:${'0'.repeat(86)}==:`)
      // agrees with the bogus digest: a server-sent integrity header
      // never stands in for hashing the body
      res.setHeader('integrity', `sha512-${'0'.repeat(86)}==`)
      return res.end(tgzAbbrev)
    }
    case '/digest-missing/-/digest-missing-1.0.0.tgz': {
      res.setHeader('content-type', 'application/octet-stream')
      res.setHeader('content-length', tgzAbbrev.byteLength)
      return res.end(tgzAbbrev)
    }
    case '/no-integrity/-/no-integrity-1.0.0.tgz': {
      // Serve a valid tarball for a package with no dist.integrity
      res.setHeader('content-type', 'application/octet-stream')
      res.setHeader('content-length', tgzAbbrev.byteLength)
      return res.end(tgzAbbrev)
    }
    case '/-/vlt/capabilities': {
      capabilitiesRequests++
      const json = JSON.stringify(capabilitiesDocument)
      res.setHeader('content-type', 'application/json')
      res.setHeader('cache-control', 'public, max-age=86400')
      res.setHeader('content-length', json.length)
      return res.end(json)
    }
    case '/no-integrity': {
      const json = JSON.stringify({
        name: 'no-integrity',
        'dist-tags': { latest: '1.0.0' },
        versions: {
          '1.0.0': {
            name: 'no-integrity',
            version: '1.0.0',
            dist: {
              tarball: `${defaultRegistry}no-integrity/-/no-integrity-1.0.0.tgz`,
            },
          },
        },
      })
      res.setHeader('content-type', 'application/json')
      res.setHeader('content-length', json.length)
      return res.end(json)
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
let corruptedOnceServed = 0
let movingRequests = 0
let movingLatest = '1.0.0'
let coalescedPackumentRequests = 0
let coalescedPackumentAccept: string | undefined
let abbrevTgzRequests = 0
let capabilitiesRequests = 0
let stableRequests: string[] = []
let stableDelay = 0
// No `stable-filter`: most registries serve none, and the packument
// fixtures here answer the full shape. The suite covering that filter
// turns it on for its own subtests.
let capabilitiesDocument: Record<string, unknown> = {
  manifests: '0.1',
  resolve: '0.1',
  mimeTypes: [
    'application/vnd.vlt.packument-v1+json',
    'application/vnd.npm.install-v1+json',
  ],
}

const defaultRegistry = `http://localhost:${PORT}/`
const options = {
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
for (const manifest of Object.values<Manifest>(pakuAbbrev.versions)) {
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

t.test('lazy registry and tar accessors reuse instances', async t => {
  const pi = new PackageInfoClient({ cache: t.testdirName })
  const rc1 = await pi.getRegistryClient()
  const rc2 = await pi.getRegistryClient()
  t.equal(rc1, rc2)
  const tar1 = await pi.getTarPool()
  const tar2 = await pi.getTarPool()
  t.equal(tar1, tar2)
})

t.test('packument', async t => {
  t.strictSame(await packument('abbrev', options), pakuAbbrev)

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

t.test(
  'manifest with leading semver characters resolves correctly',
  async t => {
    // Test that leading characters (=, ^, ~, v) resolve correctly
    // through the packument → pickManifest path
    for (const prefix of ['=', '^', '~', 'v']) {
      t.strictSame(
        await manifest(`abbrev@${prefix}2.0.0`, options),
        pakuAbbrev.versions['2.0.0'],
        `${prefix}2.0.0 should resolve correctly`,
      )
    }
  },
)

t.test('resolve', async t => {
  // do this with a consistent client so that we cover the memoizing paths
  const pi = new PackageInfoClient({
    ...options,
    'git-hosts': { fakey: `git+${pathToFileURL(repo)}#committish` },
    'git-host-archives': {
      fakey: `${defaultRegistry}abbrev/-/abbrev-2.0.0.tgz`,
    },
  })
  const resolve = (
    spec: string | Spec,
    options: PackageInfoClientOptions &
      PackageInfoClientRequestOptions = {},
  ) => pi.resolve(spec, options)

  t.matchOnly(await resolve('abbrev@2', options), {
    resolved: pakuAbbrev.versions['2.0.0'].dist.tarball,
    integrity: pakuAbbrev.versions['2.0.0'].dist.integrity,
    signatures: pakuAbbrev.versions['2.0.0'].dist.signatures,
    spec: Spec,
  })
  t.matchOnly(
    await resolve('abbrev@2', options),
    {
      resolved: pakuAbbrev.versions['2.0.0'].dist.tarball,
      integrity: pakuAbbrev.versions['2.0.0'].dist.integrity,
      signatures: pakuAbbrev.versions['2.0.0'].dist.signatures,
      spec: Spec,
    },
    'again, for memoizing',
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
  t.matchOnly(await resolve('x@fakey:abbrev-2.0.0.tgz'), {
    resolved: `${defaultRegistry}abbrev/-/abbrev-2.0.0.tgz`,
    spec: Spec,
  })
})

const tarball = (
  spec: string | Spec,
  options?: PackageInfoClientOptions &
    PackageInfoClientExtractOptions,
) => {
  return new PackageInfoClient(options).tarball(spec, options)
}

t.test('tarball', async t => {
  t.strictSame(await tarball('abbrev@2', options), tgzAbbrev)

  t.strictSame(
    await tarball('abbrev@2', {
      ...options,
      // different registry host so it's not trusted
      registry: defaultRegistry.replace(/localhost/, '127.0.0.1'),
      integrity: pakuAbbrev.versions['2.0.0'].dist.integrity,
    }),
    tgzAbbrev,
  )

  t.strictSame(
    await tarball('abbrev@2', {
      ...options,
      registry: defaultRegistry.replace(/localhost/, '127.0.0.1'),
    }),
    tgzAbbrev,
  )

  t.strictSame(
    await tarball(
      'abbrev@' + String(pakuAbbrev.versions['2.0.0'].dist.tarball),
      {
        ...options,
        integrity: pakuAbbrev.versions['2.0.0'].dist.integrity,
      },
    ),
    tgzAbbrev,
  )

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

const opts = { saveFixture: process.platform === 'win32' }
t.test('extract', opts, async t => {
  const dir = t.testdir({ 'vlt.json': '{}' })
  t.chdir(dir)
  unload()
  t.match(await extract('abbrev@2', dir + '/registry', options), {
    resolved: `${defaultRegistry}abbrev/-/abbrev-2.0.0.tgz`,
  })

  t.match(
    await extract('abbrev@2', dir + '/registry', {
      ...options,
      resolved: `${defaultRegistry}abbrev/-/abbrev-2.0.0.tgz`,
      integrity: pakuAbbrev.versions['2.0.0'].dist.integrity,
    }),
    {
      resolved: `${defaultRegistry}abbrev/-/abbrev-2.0.0.tgz`,
    },
    'should use resolved & integrity value when provided',
  )

  await t.rejects(
    extract('abbrev@2', dir + '/registry-bad-int', {
      ...options,
      resolved: `${defaultRegistry.replace(/localhost/, '127.0.0.1')}abbrev/-/abbrev-2.0.0.tgz`,
      integrity:
        'sha512-00000000000000000000000000000000000000000000000000000000000000000000000000000000000000==',
    }),
    { cause: { code: 'EINTEGRITY' } },
  )

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

t.test('remote integrity computation', async t => {
  const dir = t.testdir({ 'vlt.json': '{}' })
  t.chdir(dir)
  unload()

  // Expected integrity for abbrev-2.0.0.tgz tarball
  const expectedIntegrity =
    'sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ=='

  await t.test(
    'remote extract computes and returns integrity',
    async t => {
      const result = await extract(
        `abbrev@${defaultRegistry}abbrev/-/abbrev-2.0.0.tgz`,
        dir + '/remote-int',
        options,
      )
      t.equal(
        result.integrity,
        expectedIntegrity,
        'should compute and return integrity for remote dep',
      )
    },
  )

  await t.test(
    'remote extract with matching integrity succeeds',
    async t => {
      const result = await extract(
        `abbrev@${defaultRegistry}abbrev/-/abbrev-2.0.0.tgz`,
        dir + '/remote-match',
        {
          ...options,
          integrity: expectedIntegrity,
        },
      )
      t.equal(
        result.integrity,
        expectedIntegrity,
        'should succeed when provided integrity matches',
      )
    },
  )

  await t.test(
    'remote extract with mismatched integrity throws EINTEGRITY',
    async t => {
      await t.rejects(
        extract(
          `abbrev@${defaultRegistry}abbrev/-/abbrev-2.0.0.tgz`,
          dir + '/remote-mismatch',
          {
            ...options,
            resolved: `${defaultRegistry}abbrev/-/abbrev-2.0.0.tgz`,
            integrity:
              'sha512-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==',
          },
        ),
        { cause: { code: 'EINTEGRITY' } },
        'should throw EINTEGRITY when integrity mismatch',
      )
    },
  )
})

t.test('registry tarball integrity verification', async t => {
  await t.test(
    'extract succeeds when tarball matches dist.integrity',
    async t => {
      const dir = t.testdir({ 'vlt.json': '{}' })
      t.chdir(dir)
      unload()
      const result = await extract('abbrev@2', dir + '/good', options)
      t.match(result, {
        resolved: `${defaultRegistry}abbrev/-/abbrev-2.0.0.tgz`,
      })
      const json = readFileSync(`${dir}/good/package.json`, 'utf8')
      const pkg = JSON.parse(json)
      t.match(pkg, { name: 'abbrev', version: '2.0.0' })
    },
  )

  await t.test(
    'extract throws EINTEGRITY when tarball is corrupted',
    async t => {
      const dir = t.testdir({ 'vlt.json': '{}' })
      t.chdir(dir)
      unload()
      const pi = new PackageInfoClient({
        ...options,
        cache: dir + '/cache',
      })
      await t.rejects(
        pi.extract('corrupted@1.0.0', dir + '/corrupted'),
        { cause: { code: 'EINTEGRITY' } },
        'should throw EINTEGRITY for corrupted tarball',
      )
      // flush pending cache writes so file handles are released
      // before t.testdir() cleanup (avoids ENOTEMPTY on macOS)
      await (await pi.getRegistryClient()).cache.promise()
    },
  )

  await t.test(
    'tarball() throws EINTEGRITY when tarball is corrupted',
    async t => {
      const dir = t.testdir()
      const tb = new PackageInfoClient({
        ...options,
        cache: dir + '/cache',
      })
      // The tarball retry may cause the final error to come from
      // the registry client's checkIntegrity (which throws
      // "Integrity check failure") rather than our client-side
      // sha512 check ("Tarball integrity check failed").
      await t.rejects(tb.tarball('corrupted@1.0.0'), {
        cause: { code: 'EINTEGRITY' },
      })
      // flush pending cache writes so file handles are released
      // before t.testdir() cleanup (avoids ENOTEMPTY on macOS)
      await (await tb.getRegistryClient()).cache.promise()
    },
  )

  await t.test(
    'extract throws EINTEGRITY via client-side sha512 check',
    async t => {
      // The corrupted-no-header endpoint does NOT send an integrity
      // response header, so the registry client's checkIntegrity()
      // has nothing to check. The client-side sha512 check in
      // extract() catches the mismatch instead.
      const dir = t.testdir({ 'vlt.json': '{}' })
      t.chdir(dir)
      unload()
      const pi = new PackageInfoClient({
        ...options,
        cache: dir + '/cache',
      })
      await t.rejects(
        pi.extract(
          'corrupted-no-header@1.0.0',
          dir + '/corrupted-no-header',
        ),
        { cause: { code: 'EINTEGRITY' } },
        'should throw EINTEGRITY via sha512 check',
      )
      await (await pi.getRegistryClient()).cache.promise()
    },
  )

  await t.test(
    'tarball() throws EINTEGRITY via client-side sha512 check',
    async t => {
      const dir = t.testdir()
      const tb = new PackageInfoClient({
        ...options,
        cache: dir + '/cache',
      })
      await t.rejects(tb.tarball('corrupted-no-header@1.0.0'), {
        cause: { code: 'EINTEGRITY' },
      })
      await (await tb.getRegistryClient()).cache.promise()
    },
  )

  await t.test(
    'extract succeeds when dist.integrity is missing',
    async t => {
      const dir = t.testdir({ 'vlt.json': '{}' })
      t.chdir(dir)
      unload()
      const result = await extract(
        'no-integrity@1.0.0',
        dir + '/no-int',
        options,
      )
      t.match(result, {
        resolved: `${defaultRegistry}no-integrity/-/no-integrity-1.0.0.tgz`,
      })
      const json = readFileSync(`${dir}/no-int/package.json`, 'utf8')
      const pkg = JSON.parse(json)
      t.match(pkg, { name: 'abbrev', version: '2.0.0' })
    },
  )

  await t.test(
    'tarball() succeeds when dist.integrity is missing',
    async t => {
      const dir = t.testdir()
      const tb = new PackageInfoClient({
        ...options,
        cache: dir + '/cache',
      })
      const buf = await tb.tarball('no-integrity@1.0.0')
      t.ok(buf.length > 0, 'should return tarball data')
      t.equal(
        buf[0],
        0x1f,
        'should be a gzip file (first magic byte)',
      )
      t.equal(
        buf[1],
        0x8b,
        'should be a gzip file (second magic byte)',
      )
      await (await tb.getRegistryClient()).cache.promise()
    },
  )

  await t.test(
    'extract skips integrity check when fromLockfile is true',
    async t => {
      // When fromLockfile is explicitly set, the client-side sha512
      // check is skipped because the integrity was already verified
      // on first install.
      const dir = t.testdir({ 'vlt.json': '{}' })
      t.chdir(dir)
      unload()
      const result = await extract(
        'abbrev@2',
        dir + '/from-lockfile',
        {
          ...options,
          resolved: `${defaultRegistry}abbrev/-/abbrev-2.0.0.tgz`,
          integrity: pakuAbbrev.versions['2.0.0'].dist.integrity,
          fromLockfile: true,
        },
      )
      t.match(result, {
        resolved: `${defaultRegistry}abbrev/-/abbrev-2.0.0.tgz`,
      })
      const json = readFileSync(
        `${dir}/from-lockfile/package.json`,
        'utf8',
      )
      const pkg = JSON.parse(json)
      t.match(pkg, { name: 'abbrev', version: '2.0.0' })
    },
  )

  await t.test(
    'extract DOES verify integrity even when integrity+resolved provided without fromLockfile',
    async t => {
      // Previously, the heuristic `!!(integrity && resolved)` would
      // skip the check whenever both were provided. Now, the check
      // only skips with an explicit `fromLockfile: true`.
      const dir = t.testdir({ 'vlt.json': '{}' })
      t.chdir(dir)
      unload()
      const pi = new PackageInfoClient({
        ...options,
        cache: dir + '/cache',
      })
      await t.rejects(
        pi.extract('corrupted@1.0.0', dir + '/should-fail', {
          resolved: `${defaultRegistry}corrupted/-/corrupted-1.0.0.tgz`,
          integrity: pakuAbbrev.versions['2.0.0'].dist.integrity,
          // fromLockfile NOT set (defaults to false)
        }),
        { cause: { code: 'EINTEGRITY' } },
        'should verify tarball integrity even with integrity+resolved provided',
      )
      await (await pi.getRegistryClient()).cache.promise()
    },
  )

  await t.test(
    'extract from unzipped cache does not re-fetch tarball',
    async t => {
      const dir = t.testdir({ 'vlt.json': '{}' })
      t.chdir(dir)
      unload()
      const cacheDir = dir + '/cache'
      const tarballUrl = `${defaultRegistry}abbrev/-/abbrev-2.0.0.tgz`
      const pi = new PackageInfoClient({
        ...options,
        cache: cacheDir,
      })
      await pi.extract('abbrev@2', dir + '/first')
      await (await pi.getRegistryClient()).cache.promise()

      const cache = (await pi.getRegistryClient()).cache
      const buf = await cache.fetch(tarballUrl)
      t.ok(buf, 'tarball is in cache')
      if (!buf) return
      const e = CacheEntry.decode(buf)
      e.unzip()
      cache.set(tarballUrl, e.encode(), {
        integrity: e.integrity,
      })
      await cache.promise()

      const before = abbrevTgzRequests
      const pi2 = new PackageInfoClient({
        ...options,
        cache: cacheDir,
      })
      await pi2.extract('abbrev@2', dir + '/second')
      t.equal(
        abbrevTgzRequests,
        before,
        'no tarball requests on warm cache',
      )
      const json = readFileSync(`${dir}/second/package.json`, 'utf8')
      const pkg = JSON.parse(json) as Manifest
      t.match(pkg, { name: 'abbrev', version: '2.0.0' })

      const pi3 = new PackageInfoClient({
        ...options,
        cache: cacheDir,
      })
      const tb = await pi3.tarball('abbrev@2')
      t.equal(
        abbrevTgzRequests,
        before,
        'tarball() also issues no tarball requests on warm cache',
      )
      t.ok(tb.length > 0, 'returned cached tarball bytes')
      await (await pi2.getRegistryClient()).cache.promise()
      await (await pi3.getRegistryClient()).cache.promise()
    },
  )

  await t.test(
    'extract retries with cache bust on EINTEGRITY then succeeds',
    async t => {
      // The corrupted-once endpoint serves corrupted data the first
      // time, then correct data on the second request. This
      // simulates a CDN serving a stale/corrupted cached tarball that
      // resolves after a fresh download.
      const dir = t.testdir({ 'vlt.json': '{}' })
      t.chdir(dir)
      unload()
      corruptedOnceServed = 0
      const pi = new PackageInfoClient({
        ...options,
        cache: dir + '/cache',
      })
      const result = await pi.extract(
        'corrupted-once@1.0.0',
        dir + '/retry-ok',
      )
      t.match(result, {
        resolved: `${defaultRegistry}corrupted-once/-/corrupted-once-1.0.0.tgz`,
      })
      t.equal(
        corruptedOnceServed,
        2,
        'should have fetched twice (first corrupted, then fresh)',
      )
      await (await pi.getRegistryClient()).cache.promise()
    },
  )
})

const tarballURL = `${defaultRegistry}abbrev/-/abbrev-2.0.0.tgz`

// only the tarball's request events; the packument logs its own
const tarballLog = (states: string[]) => ({
  '@vltpkg/output': {
    logRequest: (u: URL | string, state: string) => {
      if (String(u) === tarballURL) states.push(state)
    },
  },
})

t.test('registry tarballs unpack from the cache file', async t => {
  const dir = t.testdir({ 'vlt.json': '{}' })
  t.chdir(dir)
  unload()
  const calls: string[] = []
  const states: string[] = []
  const { PackageInfoClient } = await t.mockImport<
    typeof import('../src/index.ts')
  >('../src/index.ts', {
    '@vltpkg/tar': {
      Pool: class TrackedPool extends Pool {
        async unpack(tarData: Buffer, target: string) {
          calls.push('unpack')
          return super.unpack(tarData, target)
        }
      },
    },
    ...tarballLog(states),
  })
  const opts = { ...options, cache: dir + '/cache' }

  const cold = new PackageInfoClient(opts)
  await cold.extract('abbrev@2', dir + '/cold')
  await (await cold.getRegistryClient()).cache.promise()
  t.strictSame(calls, ['unpack'], 'cold install fetches the bytes')
  t.equal(states[0], 'start', 'cold install went to the network')

  // a fresh client has an empty memory cache, so the probe hits disk
  calls.length = 0
  states.length = 0
  const warm = new PackageInfoClient(opts)
  await warm.extract('abbrev@2', dir + '/warm')
  t.strictSame(calls, ['unpack'], 'warm install unpacked once')
  t.strictSame(states, ['cache'], 'logged the hit exactly once')
  t.equal(
    (await warm.getRegistryClient()).cache.peek(tarballURL),
    undefined,
    'the body never entered the memory cache',
  )
  t.match(
    JSON.parse(readFileSync(dir + '/warm/package.json', 'utf8')),
    { name: 'abbrev', version: '2.0.0' },
  )
})

t.test('falls back when the cache file will not unpack', async t => {
  const dir = t.testdir({ 'vlt.json': '{}' })
  t.chdir(dir)
  unload()
  const opts = { ...options, cache: dir + '/cache' }
  const prime = new PackageInfoClient(opts)
  await prime.extract('abbrev@2', dir + '/prime')
  await (await prime.getRegistryClient()).cache.promise()

  const calls: string[] = []
  const states: string[] = []
  const { PackageInfoClient: PIC } = await t.mockImport<
    typeof import('../src/index.ts')
  >('../src/index.ts', {
    '@vltpkg/tar': {
      Pool: class BadFilePool extends Pool {
        async unpack(tarData: Buffer, target: string) {
          calls.push('unpack')
          // the first unpack is the cache-file fast path
          if (calls.length === 1) throw new Error('bad cache file')
          return super.unpack(tarData, target)
        }
      },
    },
    ...tarballLog(states),
  })
  await new PIC(opts).extract('abbrev@2', dir + '/fallback')
  t.strictSame(calls, ['unpack', 'unpack'], 'refetched')
  t.strictSame(states, ['cache'], 'the hit is not double-counted')
  t.match(
    JSON.parse(readFileSync(dir + '/fallback/package.json', 'utf8')),
    { name: 'abbrev', version: '2.0.0' },
  )
})

t.test('global store', async t => {
  const integrity: Integrity =
    pakuAbbrev.versions['2.0.0'].dist.integrity
  const hex = String(integrityHex(integrity))
  const lockOpts = { resolved: tarballURL, integrity }

  // what the background child writes
  const populate = (
    store: string,
    scripts = false,
    edit: (index: StoreIndex, tmp: string) => void = () => {},
  ) => {
    const tmp = pathResolve(store, '.tmp', hex)
    const { index } = unpackToStoreSync(tgzAbbrev, tmp)
    edit(index, tmp)
    writeFileSync(
      pathResolve(store, hex + '.json'),
      JSON.stringify({ ...index, scripts }),
    )
    renameSync(tmp, pathResolve(store, hex))
  }

  const setup = async (t: Test, debugged?: unknown[][]) => {
    const dir = t.testdir({ 'vlt.json': '{}' })
    t.chdir(dir)
    unload()
    const registered: unknown[][] = []
    const states: string[] = []
    const links: string[] = []
    const { PackageInfoClient } = await t.mockImport<
      typeof import('../src/index.ts')
    >('../src/index.ts', {
      ...(debugged && {
        'node:util': {
          ...util,
          debuglog: () =>
            Object.assign((...a: unknown[]) => debugged.push(a), {
              enabled: true,
            }),
        },
      }),
      '@vltpkg/cache-unzip': {
        register: (...args: unknown[]) => registered.push(args),
      },
      '@vltpkg/tar': {
        Pool: class TrackedPool extends Pool {
          async linkFromStore(
            ...args: Parameters<Pool['linkFromStore']>
          ) {
            links.push(args[0])
            return super.linkFromStore(...args)
          }
        },
      },
      ...tarballLog(states),
    })
    const cache = dir + '/cache'
    const store = pathResolve(cache, 'store/v1')
    const client = async (
      opts: PackageInfoClientOptions = {},
      noTarball = false,
    ) => {
      const pi = new PackageInfoClient({ ...options, cache, ...opts })
      if (noTarball) {
        const rc = await pi.getRegistryClient()
        rc.cachedBody = () => {
          throw new Error('read the cached tarball')
        }
        rc.request = () => {
          throw new Error('requested the tarball')
        }
      }
      return pi
    }
    // cold install into the cache, with the store off
    const prime = async () => {
      const pi = await client()
      await pi.extract('abbrev@2', dir + '/prime', lockOpts)
      await (await pi.getRegistryClient()).cache.promise()
      registered.length = 0
      states.length = 0
    }
    return {
      dir,
      cache,
      store,
      registered,
      states,
      links,
      client,
      prime,
    }
  }

  const nlink = (dir: string) => statSync(dir + '/package.json').nlink

  t.test('populated store: linked, tarball never read', async t => {
    const { dir, store, registered, states, client } = await setup(t)
    populate(store)
    let n = 1
    for (const linker of ['auto', 'hardlink'] as const) {
      const pi = await client({ 'store-linker': linker }, true)
      await pi.extract('abbrev@2', `${dir}/${linker}`, lockOpts)
      t.equal(nlink(`${dir}/${linker}`), ++n, linker)
    }
    t.strictSame(states, ['store', 'store'])
    t.strictSame(registered, [])
    t.match(
      JSON.parse(readFileSync(`${dir}/auto/package.json`, 'utf8')),
      { name: 'abbrev', version: '2.0.0' },
    )
  })

  t.test('store link carries the index manifest', async t => {
    const { dir, store, client } = await setup(t)
    populate(store)
    const pi = await client({ 'store-linker': 'hardlink' }, true)
    const res = await pi.extract('abbrev@2', dir + '/t', lockOpts)
    t.strictSame(
      JSON.parse(String(res.manifest)),
      JSON.parse(readFileSync(dir + '/t/package.json', 'utf8')),
    )
    t.equal(res.bindingGyp, false)
    t.equal(res.resolved, tarballURL)
    t.equal(res.integrity, integrity)
  })

  t.test('store copy: binding.gyp, older index', async t => {
    const { dir, store, states, client } = await setup(t)
    // a root binding.gyp implies scripts
    populate(store, true, (index, tmp) => {
      writeFileSync(pathResolve(tmp, 'binding.gyp'), '{}')
      index.files.unshift(['binding.gyp', 2, 0])
      delete index.manifest
    })
    const pi = await client({ 'store-linker': 'hardlink' }, true)
    const res = await pi.extract('abbrev@2', dir + '/t', lockOpts)
    t.strictSame(states, ['cache'], 'copied')
    t.equal(res.manifest, undefined)
    t.equal(res.bindingGyp, true)
  })

  t.test('store copy: install scripts, no binding.gyp', async t => {
    const { dir, store, client } = await setup(t)
    populate(store, true)
    const pi = await client({ 'store-linker': 'hardlink' }, true)
    const res = await pi.extract('abbrev@2', dir + '/t', lockOpts)
    t.equal(res.bindingGyp, false)
    t.type(res.manifest, 'string')
  })

  t.test('unpacked: no index data', async t => {
    const { dir, client, prime } = await setup(t)
    await prime()
    const pi = await client({ 'store-linker': 'hardlink' })
    const res = await pi.extract('abbrev@2', dir + '/t', lockOpts)
    t.equal(res.manifest, undefined)
    t.equal(res.bindingGyp, undefined)
  })

  t.test('explicit store root', async t => {
    const { dir, links, client } = await setup(t)
    populate(dir + '/elsewhere')
    const pi = await client(
      { 'store-linker': 'hardlink', storeRoot: dir + '/elsewhere' },
      true,
    )
    await pi.extract('abbrev@2', dir + '/t', lockOpts)
    t.equal(nlink(dir + '/t'), 2)
    t.strictSame(links, [pathResolve(dir, 'elsewhere', hex)])
  })

  t.test(
    'store miss, cache hit: unpacked and registered',
    async t => {
      const { dir, cache, store, registered, states, client, prime } =
        await setup(t)
      await prime()
      const pi = await client({ 'store-linker': 'auto' })
      await pi.extract('abbrev@2', dir + '/t', lockOpts)
      t.equal(nlink(dir + '/t'), 1)
      t.strictSame(states, ['cache'])
      t.strictSame(registered, [
        [
          pathResolve(cache, 'registry-client'),
          tarballURL,
          store,
          integrity,
        ],
      ])
    },
  )

  t.test(
    'damaged entry: discarded, unpacked, registered',
    async t => {
      const { dir, store, registered, client, prime } = await setup(t)
      await prime()
      populate(store)
      rmSync(`${store}/${hex}/README.md`)
      const pi = await client({ 'store-linker': 'hardlink' })
      await pi.extract('abbrev@2', dir + '/t', lockOpts)
      t.equal(nlink(dir + '/t'), 1)
      t.equal(existsSync(`${store}/${hex}`), false, 'entry removed')
      t.equal(registered.length, 1, 'queued to explode again')
    },
  )

  t.test('store miss, cache miss: disk write registers', async t => {
    const { dir, registered, states, client } = await setup(t)
    const pi = await client({ 'store-linker': 'hardlink' })
    await pi.extract('abbrev@2', dir + '/t', lockOpts)
    await (await pi.getRegistryClient()).cache.promise()
    t.equal(nlink(dir + '/t'), 1)
    t.equal(states[0], 'start', 'fetched')
    // one registration, from the cache write, none from extract()
    t.equal(registered.length, 1)
  })

  t.test('install scripts: copied, writable', async t => {
    const { dir, store, client } = await setup(t)
    populate(store, true)
    const pi = await client({ 'store-linker': 'hardlink' }, true)
    await pi.extract('abbrev@2', dir + '/t', lockOpts)
    t.equal(nlink(dir + '/t'), 1)
    writeFileSync(dir + '/t/package.json', '{}')
    t.not(readFileSync(`${store}/${hex}/package.json`, 'utf8'), '{}')
  })

  t.test('manifest install scripts: copied', async t => {
    const { dir, store, client } = await setup(t)
    populate(store)
    const pi = await client({ 'store-linker': 'hardlink' }, true)
    await pi.extract('abbrev@2', dir + '/t', {
      ...lockOpts,
      installScripts: true,
    })
    t.equal(nlink(dir + '/t'), 1)
  })

  t.test('store-linker=copy', async t => {
    const { dir, store, states, client } = await setup(t)
    populate(store)
    const pi = await client({ 'store-linker': 'copy' }, true)
    await pi.extract('abbrev@2', dir + '/t', lockOpts)
    t.equal(nlink(dir + '/t'), 1)
    t.equal(nlink(`${store}/${hex}`), 1, 'store file not linked')
    t.strictSame(states, ['cache'], 'not counted as linked')
  })

  // what the child does to a gzipped entry it did not explode
  const unzipCached = async (t: Test, pi: PackageInfoClient) => {
    const file = String(
      (await pi.getRegistryClient()).cache.integrityPath(integrity),
    )
    const entry = CacheEntry.decode(readFileSync(file))
    t.equal(entry.unzip(), true, 'was gzipped')
    writeFileSync(file, entry.encode())
  }

  t.test('store-linker=unpack, or invalid: store unused', async t => {
    const { dir, cache, store, registered, links, client, prime } =
      await setup(t)
    await prime()
    populate(store)
    const linkers = [undefined, 'unpack', 'bogus'] as const
    const extract = async (linker: (typeof linkers)[number]) => {
      const pi = await client({
        'store-linker': linker as StoreLinker | undefined,
      })
      await pi.extract('abbrev@2', `${dir}/${linker}`, lockOpts)
      t.equal(nlink(`${dir}/${linker}`), 1, String(linker))
      return pi
    }
    let pi: PackageInfoClient | undefined
    for (const linker of linkers) pi = await extract(linker)
    t.strictSame(links, [])
    // gzipped, e.g. exploded while the store was on: queued to unzip
    const queued = [
      pathResolve(cache, 'registry-client'),
      tarballURL,
      store,
      integrity,
    ]
    t.strictSame(registered, [queued, queued, queued])
    registered.length = 0
    await unzipCached(t, pi!)
    for (const linker of linkers) {
      rmSync(`${dir}/${linker}`, { recursive: true })
      await extract(linker)
    }
    t.strictSame(registered, [], 'unzipped: nothing queued')
  })

  t.test('hosted git tarballs: store unused', async t => {
    const { dir, store, links, registered, client, prime } =
      await setup(t)
    await prime()
    populate(store)
    const pi = await client({
      'store-linker': 'hardlink',
      'git-hosts': { fakey: `git+${pathToFileURL(repo)}#committish` },
      'git-host-archives': { fakey: tarballURL },
    })
    await pi.extract('x@fakey:abbrev-2.0.0.tgz', dir + '/t', lockOpts)
    t.equal(nlink(dir + '/t'), 1)
    t.strictSame(links, [])
    t.equal(registered.length, 1, 'gzipped: queued to unzip')
    registered.length = 0
    await unzipCached(t, pi)
    await pi.extract(
      'x@fakey:abbrev-2.0.0.tgz',
      dir + '/t2',
      lockOpts,
    )
    t.strictSame(registered, [])
  })

  t.test('hit rate on NODE_DEBUG at exit', async t => {
    // emitting beforeExit would also fire other modules' hooks
    const once = t.capture(process, 'once', () => process)
    const debugged: unknown[][] = []
    const { dir, store, client, prime } = await setup(t, debugged)
    await prime()
    const pi = await client({ 'store-linker': 'auto' })
    await pi.extract('abbrev@2', dir + '/miss', lockOpts)
    populate(store)
    await pi.extract('abbrev@2', dir + '/hit', lockOpts)
    await pi.extract('abbrev@2', dir + '/hit2', lockOpts)
    await pi.extract('abbrev@2', dir + '/copy', {
      ...lockOpts,
      installScripts: true,
    })
    const rate = () =>
      debugged.filter(([f]) => String(f).includes('hit rate'))
    t.strictSame(rate(), [], 'nothing until exit')
    const hooks = once().filter(c => c.args[0] === 'beforeExit')
    t.equal(hooks.length, 1, 'hooked once')
    ;(hooks[0]?.args[1] as () => void)()
    t.strictSame(rate(), [
      [
        'global store: linked=%d copied=%d missed=%d hit rate=%s%%',
        2,
        1,
        1,
        '75.0',
      ],
    ])
  })

  t.test('git specs untouched', async t => {
    const { dir, links, registered, client } = await setup(t)
    const pi = await client({ 'store-linker': 'hardlink' })
    await pi.extract(
      'x@git+' + pathToFileURL(repo).toString(),
      dir + '/git',
    )
    t.equal(existsSync(dir + '/git/package.json'), true)
    t.strictSame(links, [])
    t.strictSame(registered, [])
  })
})

t.test('extraction failures', async t => {
  const dir = t.testdir()
  const { PackageInfoClient } = await t.mockImport<
    typeof import('../src/index.ts')
  >('../src/index.ts', {
    '@vltpkg/tar': {
      Pool: class Pool {
        async unpack() {
          throw new Error('no tar for you')
        }
        async unpackFile() {
          throw new Error('no tar for you')
        }
      },
    },
  })
  const extract = (
    spec: string,
    dir: string,
    options: PackageInfoClientOptions &
      PackageInfoClientExtractOptions,
  ) => {
    return new PackageInfoClient(options).extract(spec, dir, options)
  }
  const manifest = (
    spec: string,
    options?: PackageInfoClientOptions &
      PackageInfoClientRequestOptions,
  ) => {
    return new PackageInfoClient(options).manifest(spec, options)
  }

  await t.rejects(extract('abbrev@2', dir + '/registry', options))

  await t.rejects(
    extract(
      `abbrev@${defaultRegistry}abbrev/-/abbrev-2.0.0.tgz`,
      dir + '/remote',
      options,
    ),
  )
  await t.rejects(
    manifest(
      `abbrev@${defaultRegistry}abbrev/-/abbrev-2.0.0.tgz`,
      options,
    ),
  )
  await t.rejects(manifest(`abbrev@${tgzFile}`))

  await t.rejects(
    extract(`abbrev@${tgzFile}`, dir + '/file', options),
  )
})

t.test(
  'an expired token is explained, not just reported',
  async t => {
    await t.rejects(
      packument('expired@latest', {
        ...options,
        registry: `${defaultRegistry}acme/npm/`,
      }),
      {
        message:
          'failed to fetch packument: 401 Unauthorized — Token expired. ' +
          'Authenticate again to get a new token.\n' +
          '⚠️ Your token for the "acme" account has expired. Run ' +
          '`vlt setup acme` to log in again.',
        cause: { code: 'ERESOLVE' },
      },
    )
  },
)

t.test('manifest must provide actual dist results', async t => {
  await t.rejects(resolve('deleted@latest', options))
  await t.rejects(resolve('no-tgz@latest', options))
  await t.rejects(resolve('no-dist@latest', options))
  await t.rejects(tarball('deleted@latest', options))
  await t.rejects(tarball('no-tgz@latest', options))
  await t.rejects(tarball('no-dist@latest', options))
  // Pinned specs go through packument → pickManifest too
  await t.rejects(resolve('deleted@1.0.0', options))
  await t.rejects(manifest('deleted@1.0.0', options))
  await t.rejects(tarball('deleted@1.0.0', options))
  await t.rejects(resolve('no-tgz@1.2.3', options))
  await t.rejects(tarball('no-tgz@1.2.3', options))
  await t.rejects(resolve('no-dist@1.2.3', options))
  await t.rejects(tarball('no-dist@1.2.3', options))
})

t.test('git spec must have gitRemote', async t => {
  await t.rejects(
    resolve({
      toString: () => 'x',
      final: { type: 'git' },
    } as Spec),
    {
      message: 'no remote on git specifier',
      cause: { code: 'ERESOLVE' },
    },
  )
  await t.rejects(
    manifest({
      toString: () => 'x',
      final: { type: 'git' },
    } as Spec),
    {
      message: 'no git remote',
      cause: { code: 'ERESOLVE' },
    },
  )
  await t.rejects(
    packument({
      toString: () => 'x',
      final: { type: 'git' },
    } as Spec),
    {
      message: 'git remote could not be determined',
      cause: { code: 'ERESOLVE' },
    },
  )
  await t.rejects(
    tarball({
      toString: () => 'x',
      final: { type: 'git' },
    } as Spec),
  )
  await t.rejects(
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
  await t.rejects(
    resolve(
      {
        toString: () => 'x',
        final: { type: 'remote' },
      } as Spec,
      options,
    ),
  )
  await t.rejects(
    packument(
      {
        toString: () => 'x',
        final: { type: 'remote' },
      } as Spec,
      options,
    ),
  )
  await t.rejects(
    manifest(
      {
        toString: () => 'x',
        final: { type: 'remote' },
      } as Spec,
      options,
    ),
  )
  await t.rejects(
    tarball({
      toString: () => 'x',
      final: { type: 'remote' },
    } as Spec),
  )
  await t.rejects(packument(`x@git+${pkgDir}`, options))
})

t.test('file spec must have file', async t => {
  await t.rejects(
    resolve({
      toString: () => 'x',
      final: { type: 'file' },
    } as Spec),
  )
  await t.rejects(
    packument({
      toString: () => 'x',
      final: { type: 'file' },
    } as Spec),
  )
  await t.rejects(
    manifest({
      toString: () => 'x',
      final: { type: 'file' },
    } as Spec),
  )
  await t.rejects(
    tarball({
      toString: () => 'x',
      final: { type: 'file' },
    } as Spec),
  )
})

t.test('fails on non-200 response', async t => {
  // Reset the global 404 tracker so we only capture URLs from this test,
  // making the snapshot deterministic regardless of test execution order.
  notFoundURLs.length = 0

  const d = t.testdir()
  await t.rejects(packument('lodash', options))
  await t.rejects(manifest('lodash', options))
  await t.rejects(tarball('lodash', options))
  await t.rejects(resolve('lodash', options))
  await t.rejects(tarball('missing@1.2.3', options))
  await t.rejects(extract('missing@1.2.3', d, options))

  await t.rejects(
    packument(`lodash@${defaultRegistry}lodash.tgz`, options),
  )
  await t.rejects(
    manifest(`lodash@${defaultRegistry}lodash.tgz`, options),
  )
  await t.rejects(
    tarball(`lodash@${defaultRegistry}lodash.tgz`, options),
  )
  await t.rejects(
    extract(`lodash@${defaultRegistry}lodash.tgz`, d, options),
  )

  // Verify the expected 404 URLs were hit during this test
  t.matchSnapshot(
    new Set(notFoundURLs.sort((a, b) => a.localeCompare(b))),
    'expected not-found URLs',
  )
})

t.test('workspace specs', async t => {
  const dir = t.testdir({
    'vlt.json': JSON.stringify({ workspaces: 'p/*' }),
    p: {
      a: { 'package.json': '{"name":"a"}' },
      b: { 'package.json': '{"name":"b"}' },
    },
    tarx: {},
  })
  t.chdir(dir)
  unload()
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
    'vlt.json': JSON.stringify({
      workspaces: {
        a: 'p/a*',
        b: ['p/b', 'p/bb'],
        ab: 'p/?',
        aabb: ['p/??'],
        all: 'p/*',
      },
    }),
    p: {
      a: { 'package.json': '{"name":"a"}' },
      b: { 'package.json': '{"name":"b"}' },
      aa: { 'package.json': '{"name":"aa"}' },
      bb: { 'package.json': '{"name":"bb"}' },
    },
  })
  t.chdir(dir)
  unload()
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

t.test(
  'fake packument with manifest lacking name/version',
  async t => {
    const dir = t.testdir({ 'package.json': '{}' })
    const spec = `x@${pathToFileURL(dir)}`
    t.matchSnapshot(await packument(spec))
  },
)

t.test('cache manifests', async t => {
  const xdgDir = t.testdirName
  const opts = {
    ...options,
    cache: xdgDir,
  }
  // clean up current cache directory
  await rm(pathResolve(xdgDir, 'package-info'), {
    recursive: true,
    force: true,
  }).catch(() => {})

  await t.test(
    'cache hit - manifest returned from cache',
    async t => {
      const filesBefore = await readdir(
        pathResolve(xdgDir, 'package-info'),
      ).catch(() => [])
      const pi = new PackageInfoClient(opts)
      // First call - cache miss, fetches from registry packument
      const mani1 = await pi.manifest('abbrev@2.0.0')
      t.strictSame(mani1, pakuAbbrev.versions['2.0.0'])

      // Second call - should hit cache
      const mani2 = await pi.manifest('abbrev@2.0.0')
      t.strictSame(
        mani2,
        pakuAbbrev.versions['2.0.0'],
        'cached manifest matches',
      )
      t.strictSame(mani1, mani2, 'both calls return same manifest')
      // cache writes are not awaited in the implementation so here
      // we need to wait a bit to make sure the file was written
      await new Promise(resolve => setTimeout(resolve, 100))
      const filesAfter = await readdir(
        pathResolve(xdgDir, 'package-info'),
      ).catch(() => [])
      t.equal(
        filesAfter.length,
        filesBefore.length + 1,
        'cache directory has one additional file',
      )
    },
  )

  await t.test('caching skipped with before option', async t => {
    const filesBefore = await readdir(
      pathResolve(xdgDir, 'package-info'),
    ).catch(() => [])

    const pi = new PackageInfoClient(opts)
    const beforeDate = new Date().toISOString()

    // Fetch with before option - should not cache
    const mani = await pi.manifest('abbrev@2.0.0', {
      before: beforeDate,
    })
    t.strictSame(mani, pakuAbbrev.versions['2.0.0'])

    // Verify cache directory doesn't have too many files
    // (we can't easily verify it's not cached without inspecting internals)
    await new Promise(resolve => setTimeout(resolve, 100))
    const files = await readdir(
      pathResolve(xdgDir, 'package-info'),
    ).catch(() => [])
    t.equal(
      files.length,
      filesBefore.length,
      'cache directory has no additional files',
    )
  })

  await t.test('caching skipped with dist tags', async t => {
    // clean up current cache directory
    await rm(pathResolve(xdgDir, 'package-info'), {
      recursive: true,
      force: true,
    })

    const pi = new PackageInfoClient(opts)
    const filesBefore = await readdir(
      pathResolve(xdgDir, 'package-info'),
    ).catch(() => [])

    // Use @latest tag - should not cache (dist tags are dynamic)
    const mani1 = await pi.manifest('abbrev@latest')
    t.match(mani1, { name: 'abbrev' })
    await new Promise(resolve => setTimeout(resolve, 10))
    const files = await readdir(
      pathResolve(xdgDir, 'package-info'),
    ).catch(() => [])
    t.equal(
      files.length,
      filesBefore.length,
      'cache directory has no additional files',
    )

    // Use specific version - should cache after
    const mani2 = await pi.manifest('abbrev@2.0.0')
    t.strictSame(mani2, pakuAbbrev.versions['2.0.0'])
    await new Promise(resolve => setTimeout(resolve, 10))
    const filesAfter = await readdir(
      pathResolve(xdgDir, 'package-info'),
    )
    t.equal(
      filesAfter.length,
      filesBefore.length + 1,
      'cache directory has one additional file',
    )
  })

  await t.test('caching skipped with any range', async t => {
    const filesBefore = await readdir(
      pathResolve(xdgDir, 'package-info'),
    ).catch(() => [])
    const pi = new PackageInfoClient(opts)

    // Use * range - should not cache
    const mani = await pi.manifest('abbrev@*')
    t.match(mani, { name: 'abbrev' })
    await new Promise(resolve => setTimeout(resolve, 10))
    const filesAfter = await readdir(
      pathResolve(xdgDir, 'package-info'),
    ).catch(() => [])
    t.equal(
      filesAfter.length,
      filesBefore.length,
      'cache directory has no more files',
    )
  })

  await t.test(
    'different cache keys for different options',
    async t => {
      // clean up current cache directory
      await rm(pathResolve(xdgDir, 'package-info'), {
        recursive: true,
        force: true,
      })

      const filesBefore = await readdir(
        pathResolve(xdgDir, 'package-info'),
      ).catch(() => [])

      const pi = new PackageInfoClient(opts)

      // Fetch with different node-version options
      const mani1 = await pi.manifest('abbrev@2.0.0', {
        'node-version': '18.0.0',
      })
      const mani2 = await pi.manifest('abbrev@2.0.0', {
        'node-version': '20.0.0',
      })

      t.strictSame(
        mani1,
        pakuAbbrev.versions['2.0.0'],
        'first manifest matches',
      )
      t.strictSame(
        mani2,
        pakuAbbrev.versions['2.0.0'],
        'second manifest matches',
      )

      // Both should be cached separately
      const mani1Again = await pi.manifest('abbrev@2.0.0', {
        'node-version': '18.0.0',
      })
      const mani2Again = await pi.manifest('abbrev@2.0.0', {
        'node-version': '20.0.0',
      })

      t.strictSame(mani1, mani1Again, 'first cache hit matches')
      t.strictSame(mani2, mani2Again, 'second cache hit matches')

      // cache writes are not awaited in the implementation so here
      // we need to wait a bit to make sure the files were written
      await new Promise(resolve => setTimeout(resolve, 100))
      const filesAfter = await readdir(
        pathResolve(xdgDir, 'package-info'),
      ).catch(() => [])
      t.equal(
        filesAfter.length,
        filesBefore.length + 2,
        'cache directory has two additional files',
      )
    },
  )

  await t.test('different cache keys for os and arch', async t => {
    // clean up current cache directory
    await rm(pathResolve(xdgDir, 'package-info'), {
      recursive: true,
      force: true,
    })

    const filesBefore = await readdir(
      pathResolve(xdgDir, 'package-info'),
    ).catch(() => [])

    const pi = new PackageInfoClient(opts)

    // Fetch with different os/arch combinations
    const mani1 = await pi.manifest('abbrev@2.0.0', {
      os: 'linux',
      arch: 'x64',
    })
    const mani2 = await pi.manifest('abbrev@2.0.0', {
      os: 'darwin',
      arch: 'arm64',
    })

    t.strictSame(
      mani1,
      pakuAbbrev.versions['2.0.0'],
      'linux/x64 manifest matches',
    )
    t.strictSame(
      mani2,
      pakuAbbrev.versions['2.0.0'],
      'darwin/arm64 manifest matches',
    )

    // Verify they're cached separately by fetching again
    const mani1Again = await pi.manifest('abbrev@2.0.0', {
      os: 'linux',
      arch: 'x64',
    })
    const mani2Again = await pi.manifest('abbrev@2.0.0', {
      os: 'darwin',
      arch: 'arm64',
    })

    t.strictSame(mani1, mani1Again, 'linux/x64 cache hit')
    t.strictSame(mani2, mani2Again, 'darwin/arm64 cache hit')

    // cache writes are not awaited in the implementation so here
    // we need to wait a bit to make sure the files were written
    await new Promise(resolve => setTimeout(resolve, 100))
    const filesAfter = await readdir(
      pathResolve(xdgDir, 'package-info'),
    ).catch(() => [])
    t.equal(
      filesAfter.length,
      filesBefore.length + 2,
      'cache directory has two additional files',
    )
  })

  await t.test('cache only applies to registry specs', async t => {
    // clean up current cache directory
    await rm(pathResolve(xdgDir, 'package-info'), {
      recursive: true,
      force: true,
    })

    const pi = new PackageInfoClient(opts)

    // Git specs should not be cached
    const maniGit = await pi.manifest(
      'x@git+' + pathToFileURL(repo).toString(),
    )
    t.match(maniGit, { name: 'abbrev', version: '2.0.0' })

    // File specs should not be cached
    const maniFile = await pi.manifest(`abbrev@${tgzFile}`)
    t.match(maniFile, { name: 'abbrev', version: '2.0.0' })

    // Only registry specs should be cached
    const maniRegistry = await pi.manifest('abbrev@2.0.0')
    t.strictSame(maniRegistry, pakuAbbrev.versions['2.0.0'])

    await new Promise(resolve => setTimeout(resolve, 100))

    const filesAfter = await readdir(
      pathResolve(xdgDir, 'package-info'),
    ).catch(() => [])
    t.equal(
      filesAfter.length,
      1,
      'cache directory should have only one file',
    )
  })

  await t.test(
    'cache survives invalid JSON write errors',
    async t => {
      const { PackageInfoClient: MockPIC } = await t.mockImport<
        typeof import('../src/index.ts')
      >('../src/index.ts', {
        'node:fs/promises': {
          ...(await import('node:fs/promises')),
          writeFile: async () => {
            throw new Error('write failed')
          },
        },
      })
      // clean up current cache directory
      await rm(pathResolve(xdgDir, 'package-info'), {
        recursive: true,
        force: true,
      })

      const pi = new MockPIC(opts)
      // Should still work even if cache write fails
      const mani = await pi.manifest('abbrev@2.0.0')
      t.strictSame(
        mani,
        pakuAbbrev.versions['2.0.0'],
        'manifest fetched despite cache write failure',
      )
      // these promises are not awaited in the implementation so here
      // we need to wait a bit to make sure the folder was created
      await new Promise(resolve => setTimeout(resolve, 100))
      const filesAfter = await readdir(
        pathResolve(xdgDir, 'package-info'),
      ).catch(() => [])
      t.equal(filesAfter.length, 0, 'cache directory is empty')
    },
  )

  await t.test('create cache directory if missing', async t => {
    const pi = new PackageInfoClient(opts)

    // clean up the full cache directory
    await rm(pathResolve(xdgDir), { recursive: true, force: true })

    const mani = await pi.manifest('abbrev@2.0.0')
    t.strictSame(mani, pakuAbbrev.versions['2.0.0'])

    // these promises are not awaited in the implementation so here
    // we need to wait a bit to make sure the folder was created
    await new Promise(resolve => setTimeout(resolve, 100))
    const filesAfter = await readdir(
      pathResolve(xdgDir, 'package-info'),
    ).catch(() => [])
    t.equal(filesAfter.length, 1, 'cache directory was created')
  })

  await t.test('expired cache entry', async t => {
    // clean up current cache directory
    await rm(pathResolve(xdgDir, 'package-info'), {
      recursive: true,
      force: true,
    }).catch(() => {})

    const pi = new PackageInfoClient(opts)
    const spec = Spec.parseArgs('abbrev@2.0.0', opts)
    const mani = await pi.manifest(spec)
    t.strictSame(mani, pakuAbbrev.versions['2.0.0'])
    await new Promise(resolve => setTimeout(resolve, 100))

    const filesAfter = await readdir(
      pathResolve(xdgDir, 'package-info'),
    ).catch(() => [])
    t.equal(filesAfter.length, 1, 'cache directory was created')

    // modify the cache entry to make it expired
    const cachePath = pathResolve(
      xdgDir,
      'package-info',
      pi._manifestCachePath(
        spec,
        opts as PackageInfoClientRequestOptions,
      )!,
    )
    // age the file mtime past the max cache age
    const old = new Date(Date.now() - 1000 * 60 * 60 * 24)
    await utimes(cachePath, old, old)

    // the real check here is code coverage that we only get
    // if we run the branch that removes the expired cache file
    const maniAgain = await pi.manifest('abbrev@2.0.0')
    t.strictSame(maniAgain, pakuAbbrev.versions['2.0.0'])

    await new Promise(resolve => setTimeout(resolve, 100))

    // still has a single entry at the end
    const filesAfterAgain = await readdir(
      pathResolve(xdgDir, 'package-info'),
    ).catch(() => [])
    t.equal(filesAfterAgain.length, 1, 'cache directory was created')
  })

  await t.test('legacy cache entry format', async t => {
    // clean up current cache directory
    await rm(pathResolve(xdgDir, 'package-info'), {
      recursive: true,
      force: true,
    }).catch(() => {})

    const pi = new PackageInfoClient(opts)
    const spec = Spec.parseArgs('abbrev@2.0.0', opts)
    await pi.manifest(spec)
    await new Promise(resolve => setTimeout(resolve, 100))

    const cachePath = pathResolve(
      xdgDir,
      'package-info',
      pi._manifestCachePath(
        spec,
        opts as PackageInfoClientRequestOptions,
      )!,
    )

    // rewrite in the legacy format: timestamp embedded in the
    // manifest, fresh mtime. should still be treated as expired.
    const legacy = JSON.parse(
      readFileSync(cachePath, 'utf8'),
    ) as Record<string, unknown>
    legacy.__VLT_MANIFEST_CACHE_TIMESTAMP = Date.now()
    writeFileSync(cachePath, JSON.stringify(legacy), 'utf8')

    const mani = await pi.manifest('abbrev@2.0.0')
    t.strictSame(
      mani,
      pakuAbbrev.versions['2.0.0'],
      'legacy entry is not returned as-is',
    )
    await new Promise(resolve => setTimeout(resolve, 100))

    t.equal(
      readFileSync(cachePath, 'utf8'),
      JSON.stringify(pakuAbbrev.versions['2.0.0']),
      'legacy entry rewritten in the pure manifest format',
    )
  })

  await t.test('cache file contains only the manifest', async t => {
    // clean up current cache directory
    await rm(pathResolve(xdgDir, 'package-info'), {
      recursive: true,
      force: true,
    }).catch(() => {})

    const pi = new PackageInfoClient(opts)
    const spec = Spec.parseArgs('abbrev@2.0.0', opts)
    await pi.manifest(spec)
    await new Promise(resolve => setTimeout(resolve, 100))

    const cacheDir = pathResolve(xdgDir, 'package-info')
    const cachePath = pathResolve(
      cacheDir,
      pi._manifestCachePath(
        spec,
        opts as PackageInfoClientRequestOptions,
      )!,
    )
    t.equal(
      readFileSync(cachePath, 'utf8'),
      JSON.stringify(pakuAbbrev.versions['2.0.0']),
      'file content is exactly the manifest',
    )
    t.strictSame(
      await readdir(cacheDir),
      [basename(cachePath)],
      'no temp files left behind',
    )
  })

  await t.test('concurrent misses dedup cache writes', async t => {
    // clean up current cache directory
    await rm(pathResolve(xdgDir, 'package-info'), {
      recursive: true,
      force: true,
    }).catch(() => {})

    const pi = new PackageInfoClient(opts)
    const spec = Spec.parseArgs('abbrev@2.0.0', opts)
    // both calls miss the cache and reach the write, but only the
    // first one writes — the second is skipped by the per-run dedup
    const [mani1, mani2] = await Promise.all([
      pi.manifest(spec),
      pi.manifest('abbrev@2.0.0'),
    ])
    t.strictSame(mani1, mani2, 'both calls return same manifest')
    // cache writes are not awaited in the implementation so here
    // we need to wait a bit to make sure the file was written
    await new Promise(resolve => setTimeout(resolve, 100))

    const cacheDir = pathResolve(xdgDir, 'package-info')
    const cachePath = pathResolve(
      cacheDir,
      pi._manifestCachePath(
        spec,
        opts as PackageInfoClientRequestOptions,
      )!,
    )
    t.equal(
      readFileSync(cachePath, 'utf8'),
      JSON.stringify(pakuAbbrev.versions['2.0.0']),
      'cache file was written once with the manifest',
    )
    t.strictSame(
      await readdir(cacheDir),
      [basename(cachePath)],
      'single cache file, no temp files left behind',
    )
  })
})

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
  await t.test('create repo', async () => {
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

  await t.test('resolve', async t => {
    const r = await resolve(spec, options)
    t.equal(
      r.resolved,
      `git+${pathToFileURL(repo)}#${headSha}::path:packages/xyz`,
    )
    t.end()
  })

  await t.test('manifest', async t => {
    const m = await manifest(spec, options)
    t.strictSame(m, pkg)
    await t.rejects(() => manifest(badSpec, options))
  })

  await t.test('tarball', async t => {
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

  await t.test('extract', async t => {
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

t.test(
  'full packument requests coalesce and retain manifest metadata',
  async t => {
    const pi = new PackageInfoClient({
      ...options,
      cache: t.testdir(),
    })
    coalescedPackumentRequests = 0
    coalescedPackumentAccept = undefined

    const [paku, pakuAgain, exact, range] = await Promise.all([
      pi.packument('coalesced'),
      pi.packument('coalesced'),
      pi.manifest('coalesced@2.0.0'),
      pi.manifest('coalesced@2'),
    ])

    t.equal(
      coalescedPackumentRequests,
      1,
      'made one registry request',
    )
    // Regression guard: #1692 briefly requested npm's corgi and dropped
    // license from stored manifests. See PackageInfoClient.#fetchPackument.
    t.equal(
      coalescedPackumentAccept,
      PACKUMENT_ACCEPT,
      'requested the vlt packument with a full-packument fallback',
    )
    t.notMatch(
      coalescedPackumentAccept,
      /vnd\.npm\.install/,
      'never requests npm corgi',
    )
    // A media range with no `q` is q=1.0, so an unqualified `*/*` would
    // tie with the vlt type and outrank the full packument on a registry
    // that negotiates strictly by quality.
    t.match(
      coalescedPackumentAccept,
      /\*\/\*;\s*q=0\.1\b/,
      'wildcard range ranks below the full packument',
    )
    t.equal(
      paku,
      pakuAgain,
      'packument requests returned the same object',
    )
    t.equal(
      exact,
      paku.versions['2.0.0'],
      'exact manifest came from the coalesced packument',
    )
    t.equal(
      range,
      paku.versions['2.0.0'],
      'range manifest came from the coalesced packument',
    )
    t.equal(exact.license, 'ISC', 'manifest retains license metadata')
    await (await pi.getRegistryClient()).cache.promise()
  },
)

t.test('registry capabilities', async t => {
  const pi = new PackageInfoClient({ ...options, cache: t.testdir() })
  // manifest() asks for the document too, so start from a cold memo
  resetCapabilities()
  capabilitiesRequests = 0

  t.strictSame(
    await pi.capabilities(defaultRegistry),
    capabilitiesDocument,
    'read the document the registry serves',
  )
  t.strictSame(
    await pi.capabilities(defaultRegistry),
    capabilitiesDocument,
    'the same document on a second ask',
  )
  t.equal(capabilitiesRequests, 1, 'asked the registry once')
  await (await pi.getRegistryClient()).cache.promise()
})

t.test('the ?stable packument filter', async t => {
  const client = (t: Test) => {
    // flush the background cache writes before tap removes the fixture
    // dir, or the cleanup races them (ENOTEMPTY on macOS). tap runs EOF
    // hooks in registration order, so this has to be hooked before
    // t.testdir() hooks the cleanup
    t.teardown(async () =>
      (await pi.getRegistryClient()).cache.promise(),
    )
    const pi = new PackageInfoClient({
      ...options,
      cache: t.testdir(),
    })
    return pi
  }

  const withoutFilter = capabilitiesDocument
  t.teardown(() => {
    capabilitiesDocument = withoutFilter
  })
  t.beforeEach(() => {
    resetCapabilities()
    capabilitiesDocument = {
      ...withoutFilter,
      'stable-filter': '1.0',
    }
    stableRequests = []
    stableDelay = 0
  })

  await t.test(
    'a range no prerelease can answer asks for it',
    async t => {
      const pi = client(t)
      t.equal(
        (await pi.manifest('stable-range@^1.0.0')).version,
        '1.1.0',
      )
      t.strictSame(stableRequests, ['/stable-range?stable'])
    },
  )

  await t.test('an exact version asks for it too', async t => {
    const pi = client(t)
    t.equal(
      (await pi.manifest('stable-exact@1.0.0')).version,
      '1.0.0',
    )
    t.strictSame(stableRequests, ['/stable-exact?stable'])
  })

  await t.test(
    'a registry without the filter is asked for the full packument',
    async t => {
      capabilitiesDocument = withoutFilter
      const pi = client(t)
      // settle the document first: until it lands the client asks
      // optimistically, which the next subtest covers
      await pi.capabilities(defaultRegistry)
      t.equal(
        (await pi.manifest('stable-nofilter@^1.0.0')).version,
        '1.1.0',
      )
      t.strictSame(stableRequests, ['/stable-nofilter'])
    },
  )

  await t.test(
    'selectors a prerelease can answer stay on the full packument',
    async t => {
      const cases: [string, string, string][] = [
        ['a dist tag', 'stable-tagged@next', '2.0.0-rc.1'],
        ['a bare name', 'stable-bare', '1.1.0'],
        ['the any range', 'stable-any@*', '1.1.0'],
        [
          'a range naming a prerelease',
          'stable-pre@>=2.0.0-rc.1',
          '2.0.0-rc.1',
        ],
        ['a hyphen range', 'stable-hyphen@1.0.0 - 1.1.0', '1.1.0'],
      ]
      for (const [name, spec, version] of cases) {
        await t.test(name, async t => {
          resetCapabilities()
          stableRequests = []
          const pi = client(t)
          t.equal((await pi.manifest(spec)).version, version)
          t.notMatch(
            stableRequests[0],
            /stable$/,
            'asked for the full packument',
          )
        })
      }
    },
  )

  await t.test(
    'asks optimistically before the document lands',
    async t => {
      // no round trip in front of the first packument of a cold install:
      // a registry that does not know `?stable` ignores it and serves the
      // full packument, which resolves just as well
      capabilitiesDocument = withoutFilter
      const pi = client(t)
      t.equal(
        (await pi.manifest('stable-optimistic@^1.0.0')).version,
        '1.1.0',
      )
      t.strictSame(stableRequests, ['/stable-optimistic?stable'])
    },
  )

  await t.test(
    'stops asking once the registry says it has no filter',
    async t => {
      capabilitiesDocument = withoutFilter
      const pi = client(t)
      // first ask is optimistic, and settles the document behind it
      await pi.manifest('stable-first@^1.0.0')
      await pi.capabilities(defaultRegistry)
      await pi.manifest('stable-second@^1.0.0')
      t.strictSame(stableRequests, [
        '/stable-first?stable',
        '/stable-second',
      ])
    },
  )

  await t.test('packument() answers with every version', async t => {
    // `vlt view` and `vlt deprecate` read this, and both need the
    // prereleases the stable packument drops
    const pi = client(t)
    const paku = await pi.packument('stable-viewed@^1.0.0')
    t.strictSame(Object.keys(paku.versions), [
      '1.0.0',
      '1.1.0',
      '2.0.0-rc.1',
    ])
    t.strictSame(stableRequests, ['/stable-viewed'])
  })

  await t.test(
    'an in-flight full packument answers a stable ask',
    async t => {
      const pi = client(t)
      // the capability document is what a stable ask waits on, so settle
      // it before the two asks race
      await pi.capabilities(defaultRegistry)
      stableDelay = 50

      const [full, stable] = await Promise.all([
        pi.packument('stable-shared@^1.0.0'),
        pi.manifest('stable-shared@^1.0.0'),
      ])
      t.strictSame(
        stableRequests,
        ['/stable-shared'],
        'fetched once, as the full packument',
      )
      t.equal(
        stable,
        full.versions['1.1.0'],
        'both came from that fetch',
      )
    },
  )

  await t.test('the two shapes cache separately', async t => {
    const pi = client(t)
    await pi.manifest('stable-split@^1.0.0')
    await pi.packument('stable-split@^1.0.0')
    t.strictSame(
      stableRequests,
      ['/stable-split?stable', '/stable-split'],
      'one request per representation',
    )
    await (await pi.getRegistryClient()).cache.promise()
  })
})

t.test('moving selectors force a revalidation', async t => {
  const cache = t.testdir()
  // one client per simulated process; the point is the disk cache
  const client = () => new PackageInfoClient({ ...options, cache })
  const flush = async (pi: PackageInfoClient) =>
    (await pi.getRegistryClient()).cache.promise()
  movingRequests = 0
  movingLatest = '1.0.0'

  const a = client()
  t.equal(
    (await a.packument('moving@1.0.0'))['dist-tags'].latest,
    '1.0.0',
  )
  t.equal(movingRequests, 1, 'cold miss')
  await flush(a)

  // latest moves; the cached packument is still strictly valid
  movingLatest = '2.0.0'

  const b = client()
  t.equal(
    (await b.packument('moving@1.0.0'))['dist-tags'].latest,
    '1.0.0',
    'pinned spec is still served from cache',
  )
  t.equal(movingRequests, 1, 'pinned spec made no request')
  await flush(b)

  const c = client()
  t.equal(
    (await c.packument('moving@latest'))['dist-tags'].latest,
    '2.0.0',
    'dist tag picked up the new latest',
  )
  t.equal(movingRequests, 2, 'dist tag revalidated')
  await flush(c)

  const d = client()
  t.equal(
    (await d.packument('moving'))['dist-tags'].latest,
    '2.0.0',
    'a bare name is a moving selector too',
  )
  t.equal(movingRequests, 3, 'bare name revalidated (304)')
  await flush(d)
})

t.test('moving selector does not ride a pinned request', async t => {
  const cache = t.testdir()
  movingRequests = 0
  movingLatest = '1.0.0'

  const warm = new PackageInfoClient({ ...options, cache })
  await warm.packument('moving@1.0.0')
  await (await warm.getRegistryClient()).cache.promise()
  movingLatest = '2.0.0'

  // the pinned request lands in #packumentPromises first and will settle
  // to a cache hit; the dist tag must not coalesce onto it
  const pi = new PackageInfoClient({ ...options, cache })
  const [pinned, moving] = await Promise.all([
    pi.packument('moving@1.0.0'),
    pi.packument('moving@latest'),
  ])
  t.equal(pinned['dist-tags'].latest, '1.0.0', 'pinned got the cache')
  t.equal(moving['dist-tags'].latest, '2.0.0', 'dist tag got fresh')

  // the reverse direction still coalesces: a pinned spec is happy with a
  // forced result
  const pi2 = new PackageInfoClient({ ...options, cache })
  const before = movingRequests
  const [m2, p2] = await Promise.all([
    pi2.packument('moving@latest'),
    pi2.packument('moving@1.0.0'),
  ])
  t.equal(m2, p2, 'shared one packument')
  t.equal(movingRequests, before + 1, 'made one request')
  await (await pi2.getRegistryClient()).cache.promise()
})

t.test('backgroundRevalidate', async t => {
  // no real revalidation child at exit
  const registered: string[][] = []
  const { PackageInfoClient: PIC } = await t.mockImport<
    typeof import('../src/index.ts')
  >('../src/index.ts', {
    '../../registry-client/src/cache-revalidate.ts': {
      register: (
        _: string,
        method: string,
        url: URL | string,
        accept?: string,
      ) => registered.push([method, String(url), String(accept)]),
    },
  })
  const bg = { backgroundRevalidate: true }
  const cache = t.testdir()
  const client = async () => {
    const pi = new PIC({ ...options, cache })
    const rc = await pi.getRegistryClient()
    const calls = { n: 0 }
    const request = rc.request.bind(rc)
    rc.request = (...args) => {
      calls.n++
      return request(...args)
    }
    t.teardown(() => rc.cache.promise())
    return { pi, calls }
  }
  const latest = (
    p: Promise<{ 'dist-tags': Record<string, string> }>,
  ) => p.then(p => p['dist-tags'].latest)
  const moving = `${defaultRegistry}moving`
  movingRequests = 0
  movingLatest = '1.0.0'
  const warm = await client()
  await latest(warm.pi.packument('moving@1.0.0'))
  await (await warm.pi.getRegistryClient()).cache.promise()
  // latest moves; the cached packument is still strictly valid
  movingLatest = '2.0.0'

  t.test('serves a fresh moving selector', async t => {
    for (const spec of ['moving@latest', 'moving']) {
      registered.length = 0
      const { pi } = await client()
      t.equal(await latest(pi.packument(spec, bg)), '1.0.0', spec)
      t.equal(movingRequests, 1, 'no request before use')
      t.strictSame(
        registered,
        [['GET', moving, PACKUMENT_ACCEPT]],
        'revalidates after exit, same representation',
      )
    }
  })

  t.test('forced does not ride background', async t => {
    registered.length = 0
    const { pi, calls } = await client()
    const [b, f] = await Promise.all([
      latest(pi.packument('moving@*', bg)),
      latest(pi.packument('moving@latest')),
    ])
    t.equal(b, '1.0.0')
    t.equal(f, '2.0.0', 'forced got fresh')
    t.equal(calls.n, 2)
    t.equal(movingRequests, 2)
    t.equal(registered.length, 1)
  })

  t.test('background rides forced', async t => {
    registered.length = 0
    const { pi, calls } = await client()
    const [f, b] = await Promise.all([
      latest(pi.packument('moving@latest')),
      latest(pi.packument('moving@*', bg)),
    ])
    t.equal(f, '2.0.0')
    t.equal(b, '2.0.0')
    t.equal(calls.n, 1, 'one request')
    t.equal(registered.length, 0)
  })

  t.test('background does not ride pinned', async t => {
    registered.length = 0
    const { pi, calls } = await client()
    await Promise.all([
      pi.packument('moving@1.0.0'),
      pi.packument('moving@*', bg),
    ])
    t.equal(calls.n, 2)
    t.equal(registered.length, 1)
  })

  t.test('pinned rides background', async t => {
    registered.length = 0
    const { pi, calls } = await client()
    const [b, p] = await Promise.all([
      pi.packument('moving@*', bg),
      pi.packument('moving@1.0.0'),
    ])
    t.equal(b, p, 'shared one packument')
    t.equal(calls.n, 1)
    t.equal(registered.length, 1)
  })
})

t.test('late parse failure refetches packument', async t => {
  const pi = new PackageInfoClient({
    ...options,
    cache: t.testdir(),
  })
  const paku = {
    name: 'badjson',
    'dist-tags': { latest: '1.0.0' },
    versions: {
      '1.0.0': { name: 'badjson', version: '1.0.0' },
    },
  }
  const jsonHeaders = [
    Buffer.from('content-type'),
    Buffer.from('application/json'),
  ]
  let calls = 0
  const rc = await pi.getRegistryClient()
  rc.request = async (_url, reqOptions) => {
    calls++
    if (reqOptions?.useCache === false) {
      const good = new CacheEntry(200, jsonHeaders)
      good.addBody(Buffer.from(JSON.stringify(paku)))
      return good
    }
    const bad = new CacheEntry(200, jsonHeaders)
    bad.addBody(Buffer.from('{not json}'))
    return bad
  }

  const result = await pi.packument('badjson')
  t.equal(calls, 2)
  t.equal(result.name, 'badjson')
})

t.test('packument parse failure retries once', async t => {
  const pi = new PackageInfoClient({
    ...options,
    cache: t.testdir(),
  })
  const jsonHeaders = [
    Buffer.from('content-type'),
    Buffer.from('application/json'),
  ]
  let calls = 0
  const rc = await pi.getRegistryClient()
  rc.request = async () => {
    calls++
    const bad = new CacheEntry(200, jsonHeaders)
    bad.addBody(Buffer.from('{not json}'))
    return bad
  }

  await t.rejects(pi.packument('badjson-forever'))
  t.equal(calls, 2, 'does not retry twice')
})

t.test('no registry configured', async t => {
  // there is no default registry -- both places that build a registry
  // URL throw ECONFIG rather than a bare `Invalid URL` TypeError
  const noRegistry = { cache }
  await t.rejects(packument('abbrev@latest', noRegistry), {
    cause: { code: 'ECONFIG' },
  })
  await t.rejects(manifest('abbrev@2.0.0', noRegistry), {
    cause: { code: 'ECONFIG' },
  })
})

t.test('tarballs labelled with a digest', async t => {
  const pi = () =>
    new PackageInfoClient({ ...options, cache: t.testdir() })
  const integrity = `sha512-${tgzAbbrevSha512}`

  t.test(
    'relative tarball paths resolve against the registry',
    async t => {
      const res = await pi().resolve('digest@1.0.0')
      t.match(res, {
        resolved: `${defaultRegistry}digest/-/digest-1.0.0.tgz`,
        integrity: undefined,
        digestRequired: true,
      })
    },
  )

  t.test(
    'resolve against a registry without a trailing slash',
    async t => {
      const p = new PackageInfoClient({
        ...options,
        registry: defaultRegistry.replace(/\/$/, ''),
        cache: t.testdir(),
      })
      const res = await p.resolve('digest@1.0.0')
      t.equal(
        res.resolved,
        `${defaultRegistry}digest/-/digest-1.0.0.tgz`,
      )
    },
  )

  t.test(
    'extract verifies the digest and hands the hash back',
    async t => {
      const dir = t.testdir()
      const cache = `${dir}/cache`
      const p = new PackageInfoClient({ ...options, cache })
      const res = await p.extract('digest@1.0.0', `${dir}/a`)
      t.equal(res.integrity, integrity)
      await (await p.getRegistryClient()).cache.promise()

      // a fresh resolution of the same tarball is served from the
      // in-memory cache, hash included
      const warm = await p.extract('digest@^1', `${dir}/b`)
      t.equal(warm.integrity, integrity)

      // and a fresh client unpacks it straight off the cache file
      const cold = new PackageInfoClient({ ...options, cache })
      const url = `${defaultRegistry}digest/-/digest-1.0.0.tgz`
      t.ok(
        (await cold.getRegistryClient()).cachedBody(url),
        'on disk',
      )
      const again = await cold.extract('digest@1.0.0', `${dir}/c`)
      t.equal(again.integrity, integrity)
    },
  )

  t.test('extract rejects a body that does not match', async t => {
    const dir = t.testdir()
    await t.rejects(pi().extract('digest-bad@1.0.0', dir), {
      cause: { code: 'EINTEGRITY', found: integrity },
    })
  })

  t.test('a rejected body does not survive in the cache', async t => {
    const dir = t.testdir()
    for (const name of ['digest-bad', 'digest-missing']) {
      const cache = `${dir}/${name}`
      const p = new PackageInfoClient({ ...options, cache })
      const spec = `${name}@1.0.0`
      await t.rejects(p.extract(spec, `${dir}/${name}-a`), {
        cause: { code: 'EINTEGRITY' },
      })
      const client = await p.getRegistryClient()
      await client.cache.promise()
      const url = `${defaultRegistry}${name}/-/${name}-1.0.0.tgz`
      t.equal(client.cachedBody(url), undefined, `${name} not cached`)

      // a fresh client on the same cache has to reject it too, rather
      // than unpack the leftover off the cache file and pin its hash
      const cold = new PackageInfoClient({ ...options, cache })
      t.equal(
        (await cold.getRegistryClient()).cachedBody(url),
        undefined,
        `${name} not on disk`,
      )
      await t.rejects(cold.extract(spec, `${dir}/${name}-b`), {
        cause: { code: 'EINTEGRITY' },
      })
      await t.rejects(cold.tarball(spec), {
        cause: { code: 'EINTEGRITY' },
      })
    }
  })

  t.test(
    'extract requires the digest for a vlt packument',
    async t => {
      const dir = t.testdir()
      await t.rejects(pi().extract('digest-missing@1.0.0', dir), {
        cause: { code: 'EINTEGRITY', wanted: undefined },
      })
    },
  )

  t.test(
    'a cached manifest keeps requiring the digest in a fresh client',
    async t => {
      const cache = t.testdir()
      const spec = Spec.parse('digest-missing@1.0.0', options)
      const p = new PackageInfoClient({ ...options, cache })
      t.equal((await p.resolve(spec)).digestRequired, true)
      // the manifest cache write is fire-and-forget
      await new Promise(resolve => setTimeout(resolve, 100))
      const cachePath = p._manifestCachePath(spec, {})
      if (!cachePath) throw new Error('spec is not cacheable')
      const cached = JSON.parse(
        readFileSync(cachePath, 'utf8'),
      ) as Record<string, unknown>
      t.equal(
        cached.__VLT_PACKUMENT,
        true,
        'cache file carries the marker',
      )

      const cold = new PackageInfoClient({ ...options, cache })
      const mani = await cold.manifest(spec)
      t.notOk(
        '__VLT_PACKUMENT' in mani,
        'marker stays out of the manifest',
      )
      t.equal((await cold.resolve(spec)).digestRequired, true)
      await t.rejects(cold.extract(spec, t.testdir()), {
        cause: { code: 'EINTEGRITY', wanted: undefined },
      })
    },
  )

  t.test(
    'a plain packument without integrity still records the hash',
    async t => {
      const dir = t.testdir()
      const res = await pi().extract('no-integrity@1.0.0', dir)
      t.equal(res.integrity, integrity)
    },
  )

  t.test('tarball() verifies the digest', async t => {
    const buf = await pi().tarball('digest@1.0.0')
    t.strictSame(buf, tgzAbbrev)
    await t.rejects(pi().tarball('digest-bad@1.0.0'), {
      cause: { code: 'EINTEGRITY' },
    })
    await t.rejects(pi().tarball('digest-missing@1.0.0'), {
      cause: { code: 'EINTEGRITY' },
    })
  })

  t.test('full packuments are requested as plain json', async t => {
    coalescedPackumentRequests = 0
    coalescedPackumentAccept = undefined
    const paku = await pi().packument('coalesced', { full: true })
    t.ok(paku.versions['2.0.0'])
    t.equal(coalescedPackumentAccept, 'application/json')
    t.equal(coalescedPackumentRequests, 1)
  })
})
