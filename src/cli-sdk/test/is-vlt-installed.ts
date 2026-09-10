import { resolve } from 'node:path'
import t from 'tap'
import {
  assertVltInstalled,
  isVltInstalled,
} from '../src/is-vlt-installed.ts'

t.test('isVltInstalled', async t => {
  t.equal(
    isVltInstalled(t.testdir({ node_modules: { '.vlt': {} } })),
    true,
    'store dir marks a vlt install',
  )
  t.equal(
    isVltInstalled(
      t.testdir({ node_modules: { '.vlt-lock.json': '{}' } }),
    ),
    true,
    'hidden lockfile marks a dependency-less vlt install',
  )
  t.equal(
    isVltInstalled(t.testdir({ node_modules: { '.vlt': 'file' } })),
    false,
    'store must be a directory',
  )
  t.equal(
    isVltInstalled(t.testdir({ node_modules: { foo: {} } })),
    false,
    'foreign node_modules is not a vlt install',
  )
  t.equal(isVltInstalled(t.testdir({})), false, 'no node_modules')
})

t.test('assertVltInstalled', async t => {
  t.doesNotThrow(() =>
    assertVltInstalled(
      t.testdir({ node_modules: { '.vlt': {} } }),
      'query',
    ),
  )

  const foreign = t.testdir({ node_modules: { foo: {} } })
  t.throws(() => assertVltInstalled(foreign, 'query'), {
    message:
      'node_modules was not installed by vlt: run `vlt install` to rebuild it before running `vlt query`, or use `:host()` to query another project',
    cause: { code: 'EQUERY', path: resolve(foreign, 'node_modules') },
  })

  const empty = t.testdir({})
  t.throws(() => assertVltInstalled(empty, 'ls'), {
    message:
      'Project is not installed: run `vlt install` to build the graph that `vlt ls` reads',
    cause: { code: 'EQUERY', path: resolve(empty, 'node_modules') },
  })
})
