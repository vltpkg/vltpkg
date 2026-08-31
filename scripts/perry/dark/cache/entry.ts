// Dark-test entry for @vltpkg/cache: exercises the
// real Cache class — memory roundtrip, disk write-back, fetch-from-disk,
// integrity hard-links, delete-from-disk, walk — and prints a JSON record
// a runner diffs between the compiled binary and Node.
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { Cache } from '../../../../src/cache/src/index.ts'

const dir = process.argv[2]
if (!dir) {
  process.stderr.write('usage: entry <cachedir>\n')
  process.exit(2)
}

const sha = (b: Buffer | string) =>
  createHash('sha256').update(b).digest('hex').slice(0, 16)

const out: Record<string, unknown> = {
  compiled: 'perry' in process.versions,
}

const main = async () => {
  const c = new Cache({ path: dir })

  // 1. memory roundtrip
  const val = Buffer.from('hello, cache \u{1f4be} '.repeat(100))
  c.set('key-a', val)
  out.memGet = sha(c.get('key-a') ?? Buffer.alloc(0))
  out.memGetExpected = sha(val)

  // 2. disk write-back
  await c.promise()
  const onDisk = c.path('key-a')
  out.diskBytes = sha(readFileSync(onDisk))
  out.diskKey = readFileSync(onDisk + '.key', 'utf8')

  // 3. integrity hard-link
  const tarball = Buffer.from('fake tarball bytes'.repeat(50))
  const integrity = `sha512-${createHash('sha512')
    .update(tarball)
    .digest('base64')}` as const
  c.set('key-tar', tarball, { integrity })
  await c.promise()
  const intPath = c.integrityPath(integrity)
  out.intLinked =
    !!intPath &&
    existsSync(intPath) &&
    statSync(intPath).ino === statSync(c.path('key-tar')).ino
  out.intBytes = intPath ? sha(readFileSync(intPath)) : 'missing'

  // 4. fetch() from disk on a cold instance (fetchMethod path)
  const c2 = new Cache({ path: dir })
  const fetched = await c2.fetch('key-a')
  out.fetchCold = fetched ? sha(fetched) : 'miss'
  const viaInt = await c2.fetch('key-tar', {
    context: { integrity },
  })
  out.fetchIntegrity = viaInt ? sha(viaInt) : 'miss'

  // 5. fetchSync on another cold instance
  const c3 = new Cache({ path: dir })
  const syncGot = c3.fetchSync('key-a')
  out.fetchSync = syncGot ? sha(syncGot) : 'miss'

  // 6. walk / walkSync see both entries
  const walked: string[] = []
  for await (const [k] of c2) walked.push(k)
  out.walk = walked.sort()
  const walkedSync: string[] = []
  for (const [k] of c3) walkedSync.push(k)
  out.walkSync = walkedSync.sort()

  // 7. delete from disk
  c2.delete('key-a', true)
  await c2.promise()
  out.deleted =
    !existsSync(c2.path('key-a')) &&
    !existsSync(c2.path('key-a') + '.key')

  // 8. many entries: content survives eviction churn intact
  const c4 = new Cache({ path: dir, max: 5 })
  for (let i = 0; i < 20; i++) {
    c4.set(`bulk-${i}`, Buffer.from(`payload-${i}-`.repeat(20)))
  }
  await c4.promise()
  out.boundedSize = c4.size <= 5
  const c5 = new Cache({ path: dir })
  const back = await c5.fetch('bulk-3')
  out.bulkRoundtrip =
    back ?
      sha(back) === sha(Buffer.from('payload-3-'.repeat(20)))
    : 'miss'

  process.stdout.write(JSON.stringify(out) + '\n')
}

void main().then(
  () => process.exit(0),
  er => {
    process.stderr.write(String(er) + '\n')
    process.exit(1)
  },
)
