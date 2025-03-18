import { CacheEntry } from '@vltpkg/registry-client/cache-entry'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { setTimeout } from 'node:timers/promises'
import t from 'tap'
import { runMultiple } from './fixtures/run.ts'
import { defaultVariants } from './fixtures/variants.ts'

t.test(
  'unzips all cache entries after a successful install',
  async t => {
    const { status } = await runMultiple(t, ['install', 'abbrev'], {
      variants: [...defaultVariants, 'denoBundle', 'denoSource'],
      test: async (t, { dirs }) => {
        // wait for unref'd process to finish. this is an arbitrary amount of
        // time but should be enough for a small install.
        await setTimeout(1000)

        const cacheEntries = readdirSync(
          join(dirs.cache, 'vlt/registry-client'),
          {
            withFileTypes: true,
          },
        )
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
    })
    t.equal(status, 0)
  },
)
