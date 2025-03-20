import t from 'tap'
import { runMatch } from './fixtures/run.ts'

t.test('get', async t => {
  const { stdout } = await runMatch(t, 'vlt', ['pkg', 'get'], {
    packageJson: {
      name: 'hi',
      version: '1.0.0',
    },
  })
  t.equal(JSON.parse(stdout).name, 'hi')
  t.equal(JSON.parse(stdout).version, '1.0.0')
})

t.test('get name', async t => {
  const { stdout } = await runMatch(
    t,
    'vlt',
    ['pkg', 'get', 'name'],
    {
      packageJson: {
        name: 'hi',
        version: '1.0.0',
      },
    },
  )
  t.equal(JSON.parse(stdout), 'hi')
})

t.test('get name version', async t => {
  const { status } = await runMatch(
    t,
    'vlt',
    ['pkg', 'get', 'name', 'version'],
    {
      packageJson: {
        name: 'hi',
        version: '1.0.0',
      },
    },
  )
  t.equal(status, 1)
})
