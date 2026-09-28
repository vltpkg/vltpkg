import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { cpus, tmpdir } from 'node:os'
import { join } from 'node:path'
import { performance } from 'node:perf_hooks'
import {
  readStoreIndex,
  StoreIndexCache,
} from '../../src/tar/src/store-index.ts'
import { linkFromStore } from '../../src/tar/src/link-tree.ts'

const median = values => {
  const sorted = [...values].sort((a, b) => a - b)
  return (
    (sorted[(sorted.length - 1) >> 1] + sorted[sorted.length >> 1]) /
    2
  )
}
const root = mkdtempSync(join(tmpdir(), 'vlt-store-index-bench-'))
const results = []
try {
  for (const kind of ['reader', 'materialize']) {
    for (const count of kind === 'reader' ? [64, 1024] : [256]) {
      const entry = join(root, `${kind}-${count}`)
      mkdirSync(entry)
      const files = Array.from({ length: count - 1 }, (_, n) => [
        `file-${n}.js`,
        1,
        0,
      ])
      const manifest = JSON.stringify({
        name: 'fixture',
        version: '1.0.0',
      })
      files.push(['package.json', Buffer.byteLength(manifest), 0])
      const expected = {
        v: 1,
        files,
        dirs: [],
        scripts: false,
        manifest,
      }
      for (const [name] of files)
        writeFileSync(
          join(entry, name),
          name === 'package.json' ? manifest : 'x',
        )
      writeFileSync(entry + '.json', JSON.stringify(expected))
      for (const placements of kind === 'reader' ?
        [1, 8, 32]
      : [1, 8]) {
        const groups = kind === 'reader' ? 16 : 1
        const pairs = []
        for (let pair = 0; pair < 14; pair++) {
          const row = { pair: pair - 2 }
          for (const mode of pair % 2 === 0 ?
            ['baseline', 'candidate']
          : ['candidate', 'baseline']) {
            let checksum = 0
            const start = performance.now()
            for (let group = 0; group < groups; group++) {
              const cache =
                mode === 'candidate' ?
                  new StoreIndexCache()
                : undefined
              for (let place = 0; place < placements; place++) {
                const index =
                  kind === 'reader' ?
                    cache ? cache.read(entry)
                    : readStoreIndex(entry)
                  : linkFromStore(
                      entry,
                      join(root, 'out', String(place)),
                      { indexCache: cache },
                    ).index
                checksum += index.files.length
              }
            }
            row[mode] = (performance.now() - start) / groups
            assert.equal(checksum, count * groups * placements)
            if (kind === 'materialize') {
              for (let place = 0; place < placements; place++) {
                for (const [name] of files) {
                  assert.deepEqual(
                    readFileSync(
                      join(root, 'out', String(place), name),
                    ),
                    readFileSync(join(entry, name)),
                  )
                }
              }
              rmSync(join(root, 'out'), { recursive: true })
            }
          }
          if (pair >= 2) pairs.push(row)
        }
        const baseline = median(pairs.map(pair => pair.baseline))
        const candidate = median(pairs.map(pair => pair.candidate))
        results.push({
          kind,
          files: count,
          placements,
          groups,
          baseline,
          candidate,
          reductionPercent: 100 * (1 - candidate / baseline),
          pairs,
        })
      }
    }
  }
  process.stdout.write(
    JSON.stringify(
      {
        scope:
          'Production sidecar reader and actual file materialization. A new cache per group; cache setup, stat validation and owned result copies included. No network, graph resolution or whole-install timing.',
        node: process.version,
        platform: process.platform,
        arch: process.arch,
        cpu: cpus()[0].model,
        logicalCpus: cpus().length,
        unit: 'milliseconds per group',
        pairs: 12,
        date: new Date().toISOString(),
        head: execFileSync('git', ['rev-parse', 'HEAD'], {
          encoding: 'utf8',
        }).trim(),
        sourceSha256: Object.fromEntries(
          ['store-index.ts', 'link-tree.ts'].map(name => [
            name,
            createHash('sha256')
              .update(
                readFileSync(
                  new URL(
                    '../../src/tar/src/' + name,
                    import.meta.url,
                  ),
                ),
              )
              .digest('hex'),
          ]),
        ),
        results,
      },
      null,
      2,
    ) + '\n',
  )
} finally {
  rmSync(root, { recursive: true, force: true })
}
