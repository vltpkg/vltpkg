import t from 'tap'
import { runMultiple } from './fixtures/run.ts'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

t.test('help', async t => {
  const { status } = await runMultiple(t, ['install', '--help'])
  t.equal(status, 0)
})

t.test('install a package', async t => {
  const { status } = await runMultiple(t, ['i', 'eslint'], {
    test: async (t, { dirs }) => {
      const lock = JSON.parse(
        readFileSync(join(dirs.project, 'vlt-lock.json'), 'utf-8'),
      )
      t.ok(
        lock.edges['file·. eslint'],
        'eslint should be in the lockfile',
      )
    },
  })
  t.equal(status, 0)
})
