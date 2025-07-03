import t from 'tap'
import { runMultiple } from './fixtures/run.ts'
import { setTimeout } from 'node:timers/promises'
import { readdirSync } from 'node:fs'
import { join } from 'node:path'

const findRollbacks = (dir: string) => {
  try {
    return readdirSync(dir, {
      withFileTypes: true,
    }).filter(f => f.name.startsWith('.VLT.DELETE.'))
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      // Directory doesn't exist, return empty array
      return []
    }
    throw err
  }
}

t.test('removes rollbacks after a successful install', async t => {
  const { status } = await runMultiple(t, ['i', 'abbrev@2.0.0'], {
    packageJson: true,
    variants: ['Node', 'Bundle'] as const,
    test: async ({ t, dirs, run }) => {
      await setTimeout(1000)
      await run(['install', 'abbrev@3.0.0'])
      await setTimeout(1000)
      t.strictSame(
        [
          ...findRollbacks(join(dirs.project, 'node_modules')),
          ...findRollbacks(join(dirs.project, 'node_modules/.vlt')),
        ],
        [],
        'rollbacks have been cleaned up',
      )
    },
  })
  t.equal(status, 0)
})
