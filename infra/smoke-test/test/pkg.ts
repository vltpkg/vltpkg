import t from 'tap'
import { run } from './fixtures/run.ts'

t.test('get', async t => {
  const { stdout } = await run(t, 'vlt', ['pkg', 'get'], {
    testdir: {
      'package.json': JSON.stringify({
        name: 'hi',
        version: '1.0.0',
      }),
    },
  })
  t.equal(JSON.parse(stdout).name, 'hi')
  t.equal(JSON.parse(stdout).version, '1.0.0')
})

t.test('get name', async t => {
  const { stdout } = await run(t, 'vlt', ['pkg', 'get', 'name'], {
    testdir: {
      'package.json': JSON.stringify({
        name: 'hi',
        version: '1.0.0',
      }),
    },
  })
  t.equal(JSON.parse(stdout), 'hi')
})

t.test('get name version', async t => {
  const { status } = await run(
    t,
    'vlt',
    ['pkg', 'get', 'name', 'version'],
    {
      testdir: {
        'package.json': JSON.stringify({
          name: 'hi',
          version: '1.0.0',
        }),
      },
    },
  )
  t.equal(status, 1)
})
