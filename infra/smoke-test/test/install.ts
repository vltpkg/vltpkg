import t from 'tap'
import { runMatch, run } from './fixtures/run.ts'

t.test('help', async t => {
  const { status } = await runMatch(t, 'vlt', ['install', '--help'])
  t.equal(status, 0)
})

t.todo('eslint', async t => {
  const { status } = await run(t, 'vlt', ['install', 'eslint'], {
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
