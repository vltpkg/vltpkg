import { CacheEntry } from '@vltpkg/registry-client/cache-entry'
import { readdirSync, readFileSync } from 'node:fs'
import type { Dirent } from 'node:fs'
import { join } from 'node:path'
import { setTimeout } from 'node:timers/promises'
import t from 'tap'
import { runMultiple, allVariants } from './fixtures/run.ts'

t.test(
  'unzips all cache entries after a successful install',
  async t => {
    const { status } = await runMultiple(t, ['i', 'abbrev'], {
      variants: allVariants,
      test: async ({ t, dirs }) => {
        // wait for unref'd process to finish. this is an arbitrary amount of
        // time but should be enough for a small install.
        await setTimeout(1000)

        const { keys, entries, tmp } = readdirSync(
          join(dirs.cache, 'vlt/registry-client'),
          {
            withFileTypes: true,
          },
        ).reduce<{
          keys: Dirent[]
          entries: Dirent[]
          tmp: Dirent[]
        }>(
          (acc, d) => {
            if (d.name.endsWith('.key')) {
              acc.keys.push(d)
            } else if (d.name.startsWith('.')) {
              acc.tmp.push(d)
            } else {
              acc.entries.push(d)
            }
            return acc
          },
          { keys: [], entries: [], tmp: [] },
        )
        t.strictSame(tmp, [], 'no tmp files remain')
        t.ok(keys.length, 'cache keys exist')
        t.ok(entries.length, 'cache entries exist')
        t.ok(
          entries.every(
            f =>
              !CacheEntry.isGzipEntry(
                readFileSync(join(f.parentPath, f.name)),
              ),
          ),
          'all cache entries are ungzipped',
        )
      },
    })
    t.equal(status, 0)
  },
)
