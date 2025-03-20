import t from 'tap'
import { runMatch } from './fixtures/run.ts'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

t.test('help', async t => {
  const { status } = await runMatch(t, 'vlt', ['install', '--help'])
  t.equal(status, 0)
})

t.test('install a package', async t => {
  if (process.platform === 'win32') {
    // In CI Windows fails with 'EBUSY: resource busy or locked' when cleaning up
    t.comment('skipping on windows')
    return
  }
  const { status } = await runMatch(t, 'vlt', ['install', 'eslint'], {
    packageJson: {
      name: 'hi',
      version: '1.0.0',
    },
    test: async (t, { project }) => {
      const lock = JSON.parse(
        readFileSync(join(project, 'vlt-lock.json'), 'utf-8'),
      )
      t.ok(
        lock.edges['file·. eslint'],
        'eslint should be in the lockfile',
      )
    },
  })
  t.equal(status, 0)
})
