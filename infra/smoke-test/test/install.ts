import t from 'tap'
import { runMatch } from './fixtures/run.ts'

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
    stripAnsi: true,
    testdir: {
      'package.json': JSON.stringify({
        name: 'test',
        version: '1.0.0',
      }),
    },
  })
  t.equal(status, 0)
})
