import { resolve } from 'node:path'
import t from 'tap'
import { findExecutable } from '../src/find-executable.ts'

t.test('find a bin', async t => {
  const projectRoot = t.testdir({
    node_modules: {
      '.bin': {
        foo: t.fixture('symlink', '../foo/bin.sh'),
      },
      foo: {
        'bin.sh': `#!/usr/bin/env bash
          echo hey everybody hi
        `,
      },
    },
    src: {
      blah: '',
    },
  })
  t.chdir(resolve(projectRoot, 'src'))
  t.equal(
    await findExecutable('foo', projectRoot),
    resolve(projectRoot, 'node_modules/.bin/foo'),
  )
  t.equal(await findExecutable('asdf', projectRoot), undefined)
})
