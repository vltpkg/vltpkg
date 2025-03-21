import t from 'tap'
import { runMatch } from './fixtures/run.ts'
import { defaultVariants } from './fixtures/variants.ts'
import type { VariantType } from './fixtures/variants.ts'
import { setTimeout } from 'node:timers/promises'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { CacheEntry } from '@vltpkg/registry-client/cache-entry'

const variants = [
  // TODO: figure out why compiled deno is failing only on windows
  ...defaultVariants.filter(v =>
    process.platform === 'win32' && v === 'compile' ? false : true,
  ),
  'denoBundle',
  'denoSource',
] as VariantType[]

t.test(
  'unzips all cache entries after a successful install',
  async t => {
    const { status } = await runMatch(
      t,
      'vlt',
      ['install', 'abbrev'],
      {
        stripAnsi: true,
        packageJson: {
          name: 'hi',
          version: '1.0.0',
        },
        variants,
        test: async (t, { dir }) => {
          // wait for unref'd process to finish
          // this is an arbitrary amount of time but should be enough for
          // a small install
          await setTimeout(1000)

          const cacheEntries = readdirSync(join(dir, 'cache/vlt'), {
            withFileTypes: true,
          })
            .filter(f => !f.name.endsWith('.key'))
            .map(f =>
              CacheEntry.isGzipEntry(
                readFileSync(join(f.parentPath, f.name)),
              ),
            )

          t.ok(cacheEntries.length, 'cache entries exist')
          t.ok(
            cacheEntries.every(v => !v),
            'all cache entries are ungzipped',
          )
        },
      },
    )
    t.equal(status, 0)
  },
)
