import { randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { gunzipSync, gzipSync } from 'node:zlib'
import t from 'tap'
import { Pax } from 'tar'
import { gitArchiveCommit } from '../src/git-archive-commit.ts'
import { makeTar } from './fixtures/make-tar.ts'

// `git archive --format=tar.gz HEAD` of a one-file repo, sha1 and sha256
const fixture = (f: string) =>
  readFileSync(resolve(import.meta.dirname, 'fixtures', f))
const tgz = fixture('git-archive.tgz')
const sha = 'e0f716f4d5478457c11c5da579c3e02b177cedfd'
const sha256 =
  'a797ec9b05517e24d0a2a5633eeda07ce129df0e811f6644ad390961b737eae7'

const pj = '{"name":"x","version":"1.0.0"}'
const withComment = (comment: string) =>
  makeTar([
    new Pax({ comment }, true).encode(),
    { path: 'x/package.json', size: pj.length },
    pj,
  ])

t.test('git archive', async t => {
  t.equal(gitArchiveCommit(tgz), sha, 'gzipped')
  t.equal(gitArchiveCommit(gunzipSync(tgz)), sha, 'raw')
  t.equal(
    gitArchiveCommit(fixture('git-archive-sha256.tgz')),
    sha256,
    'sha256',
  )
  t.equal(gitArchiveCommit(tgz.subarray(0, 200)), sha, 'head only')
  t.equal(
    gitArchiveCommit(gzipSync(withComment(sha))),
    sha,
    'synthetic pax',
  )
  // a corrupt tail past the head is never read
  const body = randomBytes(16384)
  const big = gzipSync(
    Buffer.concat([
      gunzipSync(tgz).subarray(0, 1024),
      makeTar([{ path: 'x/big', size: body.length }, body]),
    ]),
  )
  // flip the crc
  big.writeUInt32LE(
    ~big.readUInt32LE(big.length - 8) >>> 0,
    big.length - 8,
  )
  t.throws(() => gunzipSync(big))
  t.equal(gitArchiveCommit(big), sha, 'corrupt tail')
})

t.test('no commit', async t => {
  const npm = makeTar([
    { path: 'package/package.json', size: pj.length },
    pj,
  ])
  t.equal(gitArchiveCommit(gzipSync(npm)), undefined, 'npm tarball')
  t.equal(
    gitArchiveCommit(makeTar([new Pax({ dev: 1 }, true).encode()])),
    undefined,
    'global header without comment',
  )
  t.equal(
    gitArchiveCommit(
      makeTar([
        { path: 'pax_global_header', type: 'GlobalExtendedHeader' },
      ]),
    ),
    undefined,
    'global header without size',
  )
  t.equal(
    gitArchiveCommit(makeTar([new Pax({ comment: sha }).encode()])),
    undefined,
    'not a global header',
  )
  for (const c of [
    'hello',
    sha.toUpperCase(),
    sha.slice(1),
    sha + '0',
  ]) {
    t.equal(gitArchiveCommit(withComment(c)), undefined, c)
  }
  const raw = gunzipSync(tgz)
  t.equal(
    gitArchiveCommit(raw.subarray(0, 512)),
    undefined,
    'cut body',
  )
  const bad = Buffer.from(raw)
  bad[0] = 0
  t.equal(gitArchiveCommit(bad), undefined, 'bad checksum')
  t.equal(gitArchiveCommit(Buffer.alloc(0)), undefined, 'empty')
  t.equal(gitArchiveCommit(Buffer.from('<html>')), undefined, 'html')
  t.equal(
    gitArchiveCommit(Buffer.from([0x1f, 0x8b, 1, 2, 3])),
    undefined,
    'bad gzip',
  )
})
