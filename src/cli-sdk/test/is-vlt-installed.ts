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
  t.equal(
    isVltInstalled(t.testdir({ node_modules: 'file' })),
    false,
    'node_modules that is a file is not a vlt install',
  )
})

t.test('lstat errors other than ENOENT', async t => {
  const dir = t.testdir({ node_modules: { '.vlt': {} } })
  const { isVltInstalled, assertVltInstalled } = await t.mockImport<
    typeof import('../src/is-vlt-installed.ts')
  >('../src/is-vlt-installed.ts', {
    'node:fs': {
      lstatSync: (path: string) => {
        throw Object.assign(new Error('permission denied'), {
          code: 'EACCES',
          path,
        })
      },
    },
  })
  t.equal(
    isVltInstalled(dir),
    false,
    'unreadable node_modules is not a vlt install',
  )
  t.throws(
    () => assertVltInstalled(dir, 'query'),
    {
      message: `No vlt install found in ${resolve(dir, 'node_modules')}\n\n  run \`vlt install\` before running \`vlt query\``,
      cause: { code: 'EQUERY', path: resolve(dir, 'node_modules') },
    },
    'should raise the usage error instead of the fs error',
  )
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
    message: `No vlt install found in ${resolve(foreign, 'node_modules')}\n\n  run \`vlt install\` to rebuild it before running \`vlt query\``,
    cause: { code: 'EQUERY', path: resolve(foreign, 'node_modules') },
  })

  const nmFile = t.testdir({ node_modules: 'file' })
  t.throws(() => assertVltInstalled(nmFile, 'query'), {
    message: `No vlt install found in ${resolve(nmFile, 'node_modules')}\n\n  run \`vlt install\` before running \`vlt query\``,
    cause: { code: 'EQUERY', path: resolve(nmFile, 'node_modules') },
  })

  const empty = t.testdir({})
  t.throws(() => assertVltInstalled(empty, 'ls'), {
    message: `No vlt install found in ${resolve(empty, 'node_modules')}\n\n  run \`vlt install\` before running \`vlt ls\``,
    cause: { code: 'EQUERY', path: resolve(empty, 'node_modules') },
  })
})
